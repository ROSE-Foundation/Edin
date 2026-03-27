import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrossDomainPrizeService } from './cross-domain-prize.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type { CrossDomainDetectedEvent } from '@edin/shared';

const makeCrossDomainEvent = (
  overrides: Partial<CrossDomainDetectedEvent['payload']> = {},
): CrossDomainDetectedEvent => ({
  eventType: 'prize.event.cross_domain_detected',
  timestamp: new Date().toISOString(),
  correlationId: 'corr-1',
  actorId: 'contributor-1',
  payload: {
    contributionId: 'contrib-1',
    contributorId: 'contributor-1',
    domains: ['Technology', 'Finance'],
    channelIds: ['ch-tech', 'ch-fin'],
    ...overrides,
  },
});

const mockPrizeCategory = {
  id: 'cat-cross-domain',
  name: 'Cross-Domain Collaboration',
  description: 'Cross-domain collaboration prize',
  channelId: null,
  detectionType: 'AUTOMATED',
  thresholdConfig: {
    cross_domain: {
      operator: 'gte',
      min_domains: 2,
      min_composite_score: 70,
      significant_score_threshold: 85,
      exceptional_score_threshold: 95,
    },
  },
  scalingConfig: {
    frequency_cap: {
      max_awards_per_contributor_per_period: 3,
      period_days: 30,
    },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CrossDomainPrizeService', () => {
  let service: CrossDomainPrizeService;
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
      channel: { findFirst: vi.fn().mockResolvedValue({ id: 'ch-cross-domain' }) },
      contributor: { findUnique: vi.fn().mockResolvedValue({ domain: 'Technology' }) },
      workingGroupMember: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { workingGroup: { domain: 'Technology' } },
            { workingGroup: { domain: 'Finance' } },
          ]),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ composite_score: 85 }]),
    };
    mockEventEmitter = { emit: vi.fn() };
    mockActivityService = { createActivityEvent: vi.fn().mockResolvedValue({ id: 'event-1' }) };
    mockChathamHouseService = {
      generateLabel: vi.fn().mockResolvedValue('a finance and technology specialist'),
    };

    const module = await Test.createTestingModule({
      providers: [
        CrossDomainPrizeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: ChathamHouseAttributionService, useValue: mockChathamHouseService },
      ],
    }).compile();

    service = module.get(CrossDomainPrizeService);
  });

  describe('handleCrossDomainDetected', () => {
    it('awards prize when cross-domain event meets threshold (happy path)', async () => {
      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prizeCategoryId: 'cat-cross-domain',
            recipientContributorId: 'contributor-1',
            contributionId: 'contrib-1',
            significanceLevel: expect.any(Number),
            chathamHouseLabel: expect.any(String),
            narrative: expect.stringContaining('Technology and Finance'),
          }),
        }),
      );
    });

    it('emits PRIZE_AWARDED activity event with correct metadata', async () => {
      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PRIZE_AWARDED',
          contributorId: 'contributor-1',
          entityId: 'award-1',
          metadata: expect.objectContaining({
            prizeCategoryId: 'cat-cross-domain',
            prizeCategoryName: 'Cross-Domain Collaboration',
            prizeAwardId: 'award-1',
          }),
        }),
      );
    });

    it('emits prize.event.awarded downstream event', async () => {
      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.awarded',
        expect.objectContaining({
          eventType: 'prize.event.awarded',
          correlationId: 'corr-1',
          payload: expect.objectContaining({
            prizeAwardId: 'award-1',
            prizeCategoryId: 'cat-cross-domain',
            recipientContributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('generates correct Chatham House label for 2-domain contributor', async () => {
      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a finance and technology specialist',
          }),
        }),
      );
    });

    it('generates correct Chatham House label for 3+ domain contributor', async () => {
      mockChathamHouseService.generateLabel.mockResolvedValue(
        'a finance, impact, and technology specialist',
      );

      const event = makeCrossDomainEvent({
        domains: ['Technology', 'Finance', 'Impact'],
        channelIds: ['ch-tech', 'ch-fin', 'ch-impact'],
      });
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a finance, impact, and technology specialist',
          }),
        }),
      );
    });

    it('does NOT award when composite score below threshold', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ composite_score: 50 }]);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does NOT award when only 1 domain', async () => {
      const event = makeCrossDomainEvent({
        domains: ['Technology'],
        channelIds: ['ch-tech'],
      });
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('idempotency — no duplicate award for same contribution', async () => {
      mockPrisma.prizeAward.findFirst.mockResolvedValue({
        id: 'existing-award-1',
        contributionId: 'contrib-1',
        prizeCategoryId: 'cat-cross-domain',
      });

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('frequency cap — no award when cap exceeded', async () => {
      mockPrisma.prizeAward.count.mockResolvedValue(3);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('handles missing prize category gracefully', async () => {
      mockPrisma.prizeCategory.findFirst.mockResolvedValue(null);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('handles missing evaluation gracefully', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).not.toHaveBeenCalled();
    });

    it('determines significance level tier 1 (notable) for base threshold', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ composite_score: 72 }]);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significanceLevel: 1,
          }),
        }),
      );
    });

    it('determines significance level tier 2 (significant) for mid-range score', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ composite_score: 90 }]);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significanceLevel: 2,
          }),
        }),
      );
    });

    it('determines significance level tier 3 (exceptional) for high score', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ composite_score: 97 }]);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significanceLevel: 3,
          }),
        }),
      );
    });

    it('determines significance level tier 3 (exceptional) for 3+ domains', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { domain: 'Technology' } },
        { workingGroup: { domain: 'Finance' } },
        { workingGroup: { domain: 'Impact' } },
      ]);

      const event = makeCrossDomainEvent({
        domains: ['Technology', 'Finance', 'Impact'],
        channelIds: ['ch-tech', 'ch-fin', 'ch-impact'],
      });
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            significanceLevel: 3,
          }),
        }),
      );
    });

    it('does not throw on unexpected errors (event handler resilience)', async () => {
      mockPrisma.prizeCategory.findFirst.mockRejectedValue(new Error('DB connection lost'));

      const event = makeCrossDomainEvent();
      await expect(service.handleCrossDomainDetected(event)).resolves.not.toThrow();
    });

    it('falls back to domain channel when no CROSS_DOMAIN channel exists', async () => {
      mockPrisma.channel.findFirst.mockResolvedValue(null);

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channelId: 'ch-tech',
          }),
        }),
      );
    });

    it('generates fallback Chatham House label when no memberships found', async () => {
      mockChathamHouseService.generateLabel.mockResolvedValue('a community contributor');

      const event = makeCrossDomainEvent();
      await service.handleCrossDomainDetected(event);

      expect(mockPrisma.prizeAward.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chathamHouseLabel: 'a community contributor',
          }),
        }),
      );
    });
  });
});
