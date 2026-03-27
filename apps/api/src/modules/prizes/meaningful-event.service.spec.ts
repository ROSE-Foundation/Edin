import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeaningfulEventService } from './meaningful-event.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import type { EvaluationCompletedEvent } from '@edin/shared';

const makeEvaluationEvent = (
  overrides: Partial<EvaluationCompletedEvent['payload']> = {},
): EvaluationCompletedEvent => ({
  eventType: 'evaluation.score.completed',
  timestamp: new Date().toISOString(),
  correlationId: 'corr-1',
  actorId: 'contributor-1',
  payload: {
    evaluationId: 'eval-1',
    contributionId: 'contrib-1',
    contributorId: 'contributor-1',
    contributionTitle: 'Test Contribution',
    contributionType: 'COMMIT',
    compositeScore: 85,
    domain: 'Technology',
    ...overrides,
  },
});

describe('MeaningfulEventService', () => {
  let service: MeaningfulEventService;
  let mockPrisma: {
    workingGroupMember: { findMany: ReturnType<typeof vi.fn> };
    channel: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockActivityService: { createActivityEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      workingGroupMember: { findMany: vi.fn().mockResolvedValue([]) },
      channel: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    mockEventEmitter = { emit: vi.fn() };
    mockActivityService = { createActivityEvent: vi.fn().mockResolvedValue({ id: 'event-1' }) };

    const module = await Test.createTestingModule({
      providers: [
        MeaningfulEventService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get(MeaningfulEventService);
  });

  describe('handleEvaluationCompleted', () => {
    it('invokes both cross-domain and high-significance checks', async () => {
      const event = makeEvaluationEvent();
      await service.handleEvaluationCompleted(event);

      expect(mockPrisma.workingGroupMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contributorId: 'contributor-1' },
        }),
      );
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('continues high-significance check even if cross-domain check fails', async () => {
      mockPrisma.workingGroupMember.findMany.mockRejectedValue(new Error('DB error'));
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ percentile_95: 70, sample_size: BigInt(100) }]);

      const event = makeEvaluationEvent({ compositeScore: 95 });
      await service.handleEvaluationCompleted(event);

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('checkCrossDomainCollaboration', () => {
    it('emits event when contributor belongs to 2+ domain working groups', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { id: 'wg-tech', domain: 'Technology' } },
        { workingGroup: { id: 'wg-fin', domain: 'Finance' } },
      ]);
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'ch-tech', name: 'Technology', type: 'DOMAIN', isActive: true },
        { id: 'ch-fin', name: 'Finance', type: 'DOMAIN', isActive: true },
      ]);

      await service.checkCrossDomainCollaboration(
        'contrib-1',
        'contributor-1',
        'Technology',
        'corr-1',
      );

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'CROSS_DOMAIN_COLLABORATION_DETECTED',
          contributorId: 'contributor-1',
          entityId: 'contrib-1',
          domain: 'Technology',
        }),
      );

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            domains: expect.arrayContaining(['Technology', 'Finance']),
            channelIds: expect.arrayContaining(['ch-tech', 'ch-fin']),
            contributionId: 'contrib-1',
            contributorWorkingGroups: ['wg-tech', 'wg-fin'],
          }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.cross_domain_detected',
        expect.objectContaining({
          eventType: 'prize.event.cross_domain_detected',
          payload: expect.objectContaining({
            contributionId: 'contrib-1',
            contributorId: 'contributor-1',
            domains: expect.arrayContaining(['Technology', 'Finance']),
          }),
        }),
      );
    });

    it('does NOT emit event when contributor belongs to only 1 domain', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { id: 'wg-tech', domain: 'Technology' } },
      ]);

      await service.checkCrossDomainCollaboration(
        'contrib-1',
        'contributor-1',
        'Technology',
        'corr-1',
      );

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does NOT emit event when contributor has no working group memberships', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);

      await service.checkCrossDomainCollaboration(
        'contrib-1',
        'contributor-1',
        'Technology',
        'corr-1',
      );

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('does NOT emit event when contributor belongs to 2 groups in the same domain', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { id: 'wg-tech-1', domain: 'Technology' } },
        { workingGroup: { id: 'wg-tech-2', domain: 'Technology' } },
      ]);

      await service.checkCrossDomainCollaboration(
        'contrib-1',
        'contributor-1',
        'Technology',
        'corr-1',
      );

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('uses first domain as fallback when domain parameter is null', async () => {
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { id: 'wg-tech', domain: 'Technology' } },
        { workingGroup: { id: 'wg-fin', domain: 'Finance' } },
      ]);
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'ch-tech', name: 'Technology', type: 'DOMAIN', isActive: true },
        { id: 'ch-fin', name: 'Finance', type: 'DOMAIN', isActive: true },
      ]);

      await service.checkCrossDomainCollaboration('contrib-1', 'contributor-1', null, 'corr-1');

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'Technology',
        }),
      );
    });
  });

  describe('checkHighSignificance', () => {
    it('emits event when score exceeds 95th percentile', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentile_95: 80, sample_size: BigInt(100) }])
        .mockResolvedValueOnce([{ percentile_rank: 97 }]);
      mockPrisma.channel.findFirst.mockResolvedValue({ id: 'ch-tech' });

      await service.checkHighSignificance(
        'contrib-1',
        'contributor-1',
        92.5,
        'Technology',
        'corr-1',
      );

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION',
          contributorId: 'contributor-1',
          entityId: 'contrib-1',
          domain: 'Technology',
        }),
      );

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            compositeScore: 92.5,
            percentileRank: 97,
            domainBaseline95th: 80,
            domain: 'Technology',
            channelId: 'ch-tech',
            baselineWindowDays: 90,
            baselineSampleSize: 100,
          }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'prize.event.high_significance_detected',
        expect.objectContaining({
          eventType: 'prize.event.high_significance_detected',
          payload: expect.objectContaining({
            compositeScore: 92.5,
            percentileRank: 97,
            domainBaseline95th: 80,
            domain: 'Technology',
            channelId: 'ch-tech',
          }),
        }),
      );
    });

    it('does NOT emit event when score is below 95th percentile', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ percentile_95: 90, sample_size: BigInt(100) }]);

      await service.checkHighSignificance('contrib-1', 'contributor-1', 85, 'Technology', 'corr-1');

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does NOT emit event when score equals 95th percentile exactly', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ percentile_95: 85, sample_size: BigInt(100) }]);

      await service.checkHighSignificance('contrib-1', 'contributor-1', 85, 'Technology', 'corr-1');

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('does NOT emit event when domain is null', async () => {
      await service.checkHighSignificance('contrib-1', 'contributor-1', 95, null, 'corr-1');

      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('does NOT emit event when no evaluations exist in the window', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ percentile_95: null, sample_size: BigInt(0) }]);

      await service.checkHighSignificance('contrib-1', 'contributor-1', 85, 'Technology', 'corr-1');

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('does NOT emit event when percentile rank query returns null', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentile_95: 70, sample_size: BigInt(100) }])
        .mockResolvedValueOnce([{ percentile_rank: null }]);

      await service.checkHighSignificance('contrib-1', 'contributor-1', 95, 'Technology', 'corr-1');

      expect(mockActivityService.createActivityEvent).not.toHaveBeenCalled();
    });

    it('handles null channel gracefully (channelId = null in metadata)', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentile_95: 70, sample_size: BigInt(50) }])
        .mockResolvedValueOnce([{ percentile_rank: 98 }]);
      mockPrisma.channel.findFirst.mockResolvedValue(null);

      await service.checkHighSignificance('contrib-1', 'contributor-1', 95, 'Technology', 'corr-1');

      expect(mockActivityService.createActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            channelId: null,
          }),
        }),
      );
    });
  });
});
