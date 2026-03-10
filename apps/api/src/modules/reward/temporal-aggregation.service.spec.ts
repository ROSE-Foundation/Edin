import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('TemporalAggregationService', () => {
  let service: TemporalAggregationService;
  let mockPrisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPrisma = {
      contributionScore: {
        findMany: vi.fn(),
      },
      temporalScoreAggregate: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TemporalAggregationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(TemporalAggregationService);
  });

  describe('getPeriodBounds', () => {
    it('should compute daily bounds correctly', () => {
      const date = new Date('2026-03-10T14:30:00Z');
      const { periodStart, periodEnd } = service.getPeriodBounds('DAILY', date);

      expect(periodStart.getDate()).toBe(10);
      expect(periodEnd.getDate()).toBe(11);
    });

    it('should compute weekly bounds (Monday start)', () => {
      // March 10, 2026 is a Tuesday
      const date = new Date(2026, 2, 10);
      const { periodStart, periodEnd } = service.getPeriodBounds('WEEKLY', date);

      expect(periodStart.getDay()).toBe(1); // Monday
      expect(periodEnd.getDay()).toBe(1); // Next Monday
    });

    it('should compute monthly bounds correctly', () => {
      const date = new Date(2026, 2, 15); // March 15
      const { periodStart, periodEnd } = service.getPeriodBounds('MONTHLY', date);

      expect(periodStart.getMonth()).toBe(2); // March
      expect(periodStart.getDate()).toBe(1);
      expect(periodEnd.getMonth()).toBe(3); // April
      expect(periodEnd.getDate()).toBe(1);
    });

    it('should compute quarterly bounds correctly', () => {
      const date = new Date(2026, 4, 20); // May = Q2
      const { periodStart, periodEnd } = service.getPeriodBounds('QUARTERLY', date);

      expect(periodStart.getMonth()).toBe(3); // April
      expect(periodEnd.getMonth()).toBe(6); // July
    });

    it('should compute yearly bounds correctly', () => {
      const date = new Date(2026, 6, 1);
      const { periodStart, periodEnd } = service.getPeriodBounds('YEARLY', date);

      expect(periodStart.getFullYear()).toBe(2026);
      expect(periodStart.getMonth()).toBe(0);
      expect(periodEnd.getFullYear()).toBe(2027);
    });
  });

  describe('aggregateForHorizon', () => {
    it('should aggregate scores for a contributor and horizon', async () => {
      mockPrisma.contributionScore.findMany.mockResolvedValue([
        { compositeScore: 80 },
        { compositeScore: 90 },
      ]);

      mockPrisma.temporalScoreAggregate.findFirst.mockResolvedValue(null); // No previous

      const upsertedAggregate = {
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'DAILY',
        periodStart: new Date('2026-03-10'),
        periodEnd: new Date('2026-03-11'),
        aggregatedScore: 85,
        contributionCount: 2,
        trend: 'STABLE',
        computedAt: new Date(),
      };

      mockPrisma.temporalScoreAggregate.upsert.mockResolvedValue(upsertedAggregate);

      const result = await service.aggregateForHorizon('user-1', 'DAILY', 'corr-1');

      expect(result.aggregatedScore).toBe(85);
      expect(result.contributionCount).toBe(2);
      expect(result.trend).toBe('STABLE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reward.score.aggregated',
        expect.objectContaining({ eventType: 'reward.score.aggregated' }),
      );
    });

    it('should produce idempotent results on re-run', async () => {
      // Same inputs → same upsert data
      mockPrisma.contributionScore.findMany.mockResolvedValue([{ compositeScore: 75 }]);
      mockPrisma.temporalScoreAggregate.findFirst.mockResolvedValue(null);

      const aggregate = {
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'DAILY',
        periodStart: new Date(),
        periodEnd: new Date(),
        aggregatedScore: 75,
        contributionCount: 1,
        trend: 'STABLE',
        computedAt: new Date(),
      };

      mockPrisma.temporalScoreAggregate.upsert.mockResolvedValue(aggregate);

      const result1 = await service.aggregateForHorizon('user-1', 'DAILY', 'corr-1');
      const result2 = await service.aggregateForHorizon('user-1', 'DAILY', 'corr-2');

      expect(result1.aggregatedScore).toBe(result2.aggregatedScore);
      expect(result1.contributionCount).toBe(result2.contributionCount);
    });

    it('should detect RISING trend when score increases >5%', async () => {
      mockPrisma.contributionScore.findMany.mockResolvedValue([{ compositeScore: 90 }]);

      // Previous period had score of 70
      mockPrisma.temporalScoreAggregate.findFirst.mockResolvedValue({
        id: 'prev',
        aggregatedScore: 70,
      });

      const aggregate = {
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'MONTHLY',
        periodStart: new Date(),
        periodEnd: new Date(),
        aggregatedScore: 90,
        contributionCount: 1,
        trend: 'RISING',
        computedAt: new Date(),
      };

      mockPrisma.temporalScoreAggregate.upsert.mockResolvedValue(aggregate);

      const result = await service.aggregateForHorizon('user-1', 'MONTHLY', 'corr-1');

      expect(result.trend).toBe('RISING');
    });

    it('should detect DECLINING trend when score decreases >5%', async () => {
      mockPrisma.contributionScore.findMany.mockResolvedValue([{ compositeScore: 60 }]);

      // Previous period had score of 80
      mockPrisma.temporalScoreAggregate.findFirst.mockResolvedValue({
        id: 'prev',
        aggregatedScore: 80,
      });

      const aggregate = {
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'MONTHLY',
        periodStart: new Date(),
        periodEnd: new Date(),
        aggregatedScore: 60,
        contributionCount: 1,
        trend: 'DECLINING',
        computedAt: new Date(),
      };

      mockPrisma.temporalScoreAggregate.upsert.mockResolvedValue(aggregate);

      const result = await service.aggregateForHorizon('user-1', 'MONTHLY', 'corr-1');

      expect(result.trend).toBe('DECLINING');
    });

    it('should return 0 score when no contributions in period', async () => {
      mockPrisma.contributionScore.findMany.mockResolvedValue([]);
      mockPrisma.temporalScoreAggregate.findFirst.mockResolvedValue(null);

      const aggregate = {
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'DAILY',
        periodStart: new Date(),
        periodEnd: new Date(),
        aggregatedScore: 0,
        contributionCount: 0,
        trend: 'STABLE',
        computedAt: new Date(),
      };

      mockPrisma.temporalScoreAggregate.upsert.mockResolvedValue(aggregate);

      const result = await service.aggregateForHorizon('user-1', 'DAILY', 'corr-1');

      expect(result.aggregatedScore).toBe(0);
      expect(result.contributionCount).toBe(0);
    });
  });

  describe('handleScoreCalculated', () => {
    it('should trigger session aggregation on score calculated event', async () => {
      const spy = vi.spyOn(service, 'aggregateForHorizon').mockResolvedValue({
        id: 'agg-1',
        contributorId: 'user-1',
        horizon: 'SESSION',
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        aggregatedScore: 80,
        contributionCount: 1,
        trend: 'STABLE',
        computedAt: new Date().toISOString(),
      });

      await service.handleScoreCalculated({
        eventType: 'reward.score.calculated',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        payload: {
          contributionScoreId: 'score-1',
          contributionId: 'contrib-1',
          contributorId: 'user-1',
          compositeScore: 80,
          domain: null,
        },
      });

      expect(spy).toHaveBeenCalledWith('user-1', 'SESSION', 'corr-1');
    });
  });

  describe('getContributorAggregates', () => {
    it('should return latest aggregate for each horizon', async () => {
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([
        {
          id: 'agg-session-2',
          contributorId: 'user-1',
          horizon: 'SESSION',
          periodStart: new Date('2026-03-10'),
          periodEnd: new Date('2026-03-11'),
          aggregatedScore: 85,
          contributionCount: 1,
          trend: 'STABLE',
          computedAt: new Date(),
        },
        {
          id: 'agg-session-1',
          contributorId: 'user-1',
          horizon: 'SESSION',
          periodStart: new Date('2026-03-09'),
          periodEnd: new Date('2026-03-10'),
          aggregatedScore: 70,
          contributionCount: 2,
          trend: 'STABLE',
          computedAt: new Date(),
        },
        {
          id: 'agg-monthly',
          contributorId: 'user-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2026-03-01'),
          periodEnd: new Date('2026-04-01'),
          aggregatedScore: 78,
          contributionCount: 5,
          trend: 'RISING',
          computedAt: new Date(),
        },
      ]);

      const result = await service.getContributorAggregates('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].horizon).toBe('SESSION');
      expect(result[0].aggregatedScore).toBe(85); // Latest session, not older one
      expect(result[1].horizon).toBe('MONTHLY');
    });
  });

  describe('aggregateAllContributors', () => {
    it('should aggregate for all contributors with scores in period', async () => {
      mockPrisma.contributionScore.findMany.mockResolvedValue([
        { contributorId: 'user-1' },
        { contributorId: 'user-2' },
      ]);

      const spy = vi.spyOn(service, 'aggregateForHorizon').mockResolvedValue({
        id: 'agg',
        contributorId: 'user-1',
        horizon: 'DAILY',
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        aggregatedScore: 80,
        contributionCount: 1,
        trend: 'STABLE',
        computedAt: new Date().toISOString(),
      });

      const count = await service.aggregateAllContributors('DAILY', 'corr-1');

      expect(count).toBe(2);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
