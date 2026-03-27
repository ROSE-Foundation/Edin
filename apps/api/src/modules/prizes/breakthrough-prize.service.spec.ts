import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BreakthroughPrizeService } from './breakthrough-prize.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type { HighSignificanceDetectedEvent } from '@edin/shared';

const makeHighSignificanceEvent = (
  overrides: Partial<HighSignificanceDetectedEvent['payload']> = {},
): HighSignificanceDetectedEvent => ({
  eventType: 'prize.event.high_significance_detected',
  timestamp: new Date().toISOString(),
  correlationId: 'corr-1',
  actorId: 'contributor-1',
  payload: {
    contributionId: 'contrib-1',
    contributorId: 'contributor-1',
    compositeScore: 98,
    percentileRank: 99,
    domainBaseline95th: 88.0,
    domain: 'Technology',
    channelId: 'ch-tech',
    ...overrides,
  },
});

const mockPrizeCategory = {
  id: 'cat-breakthrough',
  name: 'Breakthrough',
  description: 'Awarded for breakthrough contributions',
  channelId: null,
  detectionType: 'AUTOMATED',
  thresholdConfig: {
    breakthrough: {
      operator: 'discrete_step',
      percentile_threshold: 99,
      min_complexity_multiplier: 1.5,
      baseline_window_days: 90,
      min_historical_contributions: 10,
    },
  },
  scalingConfig: {
    temporal_decay: { enabled: true, half_life_days: 365 },
    frequency_cap: {
      max_awards_per_contributor_per_period: 1,
      period_days: 90,
    },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BreakthroughPrizeService', () => {
  let service: BreakthroughPrizeService;
  let mockPrisma: {
    prizeCategory: { findFirst: ReturnType<typeof vi.fn> };
    prizeAward: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    channel: { findFirst: ReturnType<typeof vi.fn> };
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    workingGroupMember: { findMany: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockActivityService: { createActivityEvent: ReturnType<typeof vi.fn> };
  let mockChathamHouseService: { generateLabel: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      prizeCategory: { findFirst: vi.fn().mockResolvedValue(mockPrizeCategory) },
      prizeAward: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'award-1' }),
        count: vi.fn().mockResolvedValue(0),
      },
      channel: { findFirst: vi.fn().mockResolvedValue({ id: 'ch-tech' }) },
      contributor: { findUnique: vi.fn().mockResolvedValue({ domain: 'Technology' }) },
      workingGroupMember: {
        findMany: vi.fn().mockResolvedValue([{ workingGroup: { domain: 'Technology' } }]),
      },
      // Default: 99th percentile = 95, sample size = 50, complexity = 2.0
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ percentile_value: 95, sample_size: BigInt(50) }])
        .mockResolvedValueOnce([{ complexity_multiplier: 2.0 }]),
    };
    mockEventEmitter = { emit: vi.fn() };
    mockActivityService = { createActivityEvent: vi.fn().mockResolvedValue({ id: 'event-1' }) };
    mockChathamHouseService = {
      generateLabel: vi.fn().mockResolvedValue('a technology specialist'),
    };

    const module = await Test.createTestingModule({
      providers: [
        BreakthroughPrizeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: ChathamHouseAttributionService, useValue: mockChathamHouseService },
      ],
    }).compile();

    service = module.get(BreakthroughPrizeService);
  });

  describe('handleHighSignificanceDetected', () => {
    it('awards breakthrough prize when score exceeds 99th percentile and complexity is sufficient (happy path)', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prizeCategoryId: 'cat-breakthrough',
            recipientContributorId: 'contributor-1',
            contributionId: 'contrib-1',
            significanceLevel: 3,
            chathamHouseLabel: expect.any(String),
            narrative: expect.stringContaining('Breakthrough'),
          }),
        }),
      );
    });

    it('sets significance level to 3 (exceptional) for all breakthrough awards', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significanceLevel: 3,
          }),
        }),
      );
    });

    it('emits PRIZE_AWARDED activity event with isBreakthrough flag', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PRIZE_AWARDED',
          title: 'Breakthrough Prize Awarded (Exceptional)',
          contributorId: 'contributor-1',
          entityId: 'award-1',
          metadata: expect.objectContaining({
            prizeCategoryId: 'cat-breakthrough',
            prizeCategoryName: 'Breakthrough',
            prizeAwardId: 'award-1',
            isBreakthrough: true,
          }),
        }),
      );
    });

    it('emits prize.event.awarded downstream event', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.awarded',
        expect.objectContaining({
          eventType: 'prize.event.awarded',
          correlationId: 'corr-1',
          payload: expect.objectContaining({
            prizeAwardId: 'award-1',
            prizeCategoryId: 'cat-breakthrough',
            prizeCategoryName: 'Breakthrough',
            recipientContributorId: 'contributor-1',
            significanceLevel: 3,
          }),
        }),
      );
    });

    it('does NOT award when composite score is at 95th percentile but below 99th (high bar check)', async () => {
      // Score is 92, 99th percentile threshold is 95 → 92 <= 95, no award
      mockPrisma.$queryRaw = vi
        .fn()
        .mockResolvedValueOnce([{ percentile_value: 95, sample_size: BigInt(50) }]);

      const event = makeHighSignificanceEvent({ compositeScore: 92 });
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does NOT award when complexity multiplier is below threshold', async () => {
      mockPrisma.$queryRaw = vi
        .fn()
        .mockResolvedValueOnce([{ percentile_value: 90, sample_size: BigInt(50) }])
        .mockResolvedValueOnce([{ complexity_multiplier: 1.2 }]);

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('skips detection when domain has fewer than 10 historical contributions (insufficient baseline)', async () => {
      mockPrisma.$queryRaw = vi
        .fn()
        .mockResolvedValueOnce([{ percentile_value: 80, sample_size: BigInt(5) }]);

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('idempotency — no duplicate award for same contribution', async () => {
      mockPrisma.prizeAward.findFirst.mockResolvedValue({
        id: 'existing-award-1',
        contributionId: 'contrib-1',
        prizeCategoryId: 'cat-breakthrough',
      });

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('frequency cap — no award when cap exceeded', async () => {
      mockPrisma.prizeAward.count.mockResolvedValue(1);

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('handles missing Breakthrough prize category gracefully', async () => {
      mockPrisma.prizeCategory.findFirst.mockResolvedValue(null);

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('generates correct Chatham House label for single-domain contributor', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a technology specialist',
          }),
        }),
      );
    });

    it('generates fallback Chatham House label when no memberships found', async () => {
      mockChathamHouseService.generateLabel.mockResolvedValue('a community contributor');

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a community contributor',
          }),
        }),
      );
    });

    it('narrative references baseline threshold and percentile', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            narrative: expect.stringMatching(/99th percentile.*95/),
          }),
        }),
      );
    });

    it('includes isBreakthrough flag in prize award metadata', async () => {
      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              isBreakthrough: true,
              compositeScore: 98,
              complexityMultiplier: 2.0,
            }),
          }),
        }),
      );
    });

    it('does not throw on unexpected errors (event handler resilience)', async () => {
      mockPrisma.prizeCategory.findFirst.mockRejectedValue(new Error('DB connection lost'));

      const event = makeHighSignificanceEvent();
      await expect(service.handleHighSignificanceDetected(event)).resolves.not.toThrow();
    });

    it('uses event channelId directly and skips DB lookup when present', async () => {
      const event = makeHighSignificanceEvent({ channelId: 'ch-from-event' });
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.channel.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channelId: 'ch-from-event',
          }),
        }),
      );
    });

    it('resolves channel from domain when event channelId is null', async () => {
      const event = makeHighSignificanceEvent({ channelId: null });
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.channel.findFirst).toHaveBeenCalledWith({
        where: { type: 'DOMAIN', name: 'Technology', isActive: true },
        select: { id: true },
      });
      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channelId: 'ch-tech',
          }),
        }),
      );
    });

    it('does not award when no channel can be resolved', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue(null);

      const event = makeHighSignificanceEvent({ channelId: null });
      await service.handleHighSignificanceDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('defaults complexity multiplier to 1.0 when evaluation has null value', async () => {
      mockPrisma.$queryRaw = vi
        .fn()
        .mockResolvedValueOnce([{ percentile_value: 90, sample_size: BigInt(50) }])
        .mockResolvedValueOnce([{ complexity_multiplier: null }]);

      const event = makeHighSignificanceEvent();
      await service.handleHighSignificanceDetected(event);

      // 1.0 < 1.5 threshold → no award
      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });
  });
});
