import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { REWARD_METHODOLOGY } from '@edin/shared';
import { ShowcaseService } from './showcase.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';

const mockPrisma = {
  contributor: {
    count: vi.fn(),
    groupBy: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};

describe('ShowcaseService', () => {
  let service: ShowcaseService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ShowcaseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(ShowcaseService);
  });

  describe('getPlatformMetrics', () => {
    it('returns correct active contributor count (only is_active = true)', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(5) // active count
        .mockResolvedValueOnce(3) // created before 30 days
        .mockResolvedValueOnce(2); // still active
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([
        { domain: 'Technology', _count: { id: 3 } },
        { domain: 'Finance', _count: { id: 2 } },
      ]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      const result = await service.getPlatformMetrics();

      expect(result.activeContributors).toBe(5);
      expect(mockPrisma.contributor.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('returns domain distribution with percentages', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(10) // active count
        .mockResolvedValueOnce(5) // created before 30 days
        .mockResolvedValueOnce(4); // still active
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([
        { domain: 'Technology', _count: { id: 4 } },
        { domain: 'Finance', _count: { id: 3 } },
        { domain: 'Impact', _count: { id: 2 } },
        { domain: 'Governance', _count: { id: 1 } },
      ]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      const result = await service.getPlatformMetrics();

      expect(result.domainDistribution).toHaveLength(4);
      expect(result.domainDistribution[0]).toEqual({
        domain: 'Technology',
        count: 4,
        percentage: 40,
      });
      expect(result.domainDistribution[1]).toEqual({
        domain: 'Finance',
        count: 3,
        percentage: 30,
      });

      const totalPercentage = result.domainDistribution.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBe(100);
    });

    it('returns 0 contribution velocity (Phase 1 placeholder)', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      const result = await service.getPlatformMetrics();

      expect(result.contributionVelocity).toBe(0);
    });

    it('returns retention rate based on creation dates', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(10) // active count
        .mockResolvedValueOnce(8) // created before 30 days
        .mockResolvedValueOnce(6); // still active after 30 days
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      const result = await service.getPlatformMetrics();

      // 6/8 = 75%
      expect(result.retentionRate).toBe(75);
    });

    it('handles empty database (0 contributors) gracefully', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(0) // active count
        .mockResolvedValueOnce(0) // created before 30 days
        .mockResolvedValueOnce(0); // still active
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      const result = await service.getPlatformMetrics();

      expect(result.activeContributors).toBe(0);
      expect(result.contributionVelocity).toBe(0);
      expect(result.domainDistribution).toEqual([]);
      expect(result.retentionRate).toBe(0);
    });

    it('returns cached metrics on cache hit', async () => {
      const cachedMetrics = {
        activeContributors: 42,
        contributionVelocity: 0,
        domainDistribution: [{ domain: 'Technology', count: 42, percentage: 100 }],
        retentionRate: 85,
      };
      mockRedis.get.mockResolvedValueOnce(cachedMetrics);

      const result = await service.getPlatformMetrics();

      expect(result).toEqual(cachedMetrics);
      expect(mockPrisma.contributor.count).not.toHaveBeenCalled();
      expect(mockPrisma.contributor.groupBy).not.toHaveBeenCalled();
    });

    it('computes and caches on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPrisma.contributor.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      mockPrisma.contributor.groupBy.mockResolvedValueOnce([
        { domain: 'Technology', _count: { id: 5 } },
      ]);
      mockRedis.set.mockResolvedValueOnce(undefined);

      await service.getPlatformMetrics();

      expect(mockRedis.set).toHaveBeenCalledWith(
        'showcase:platform-metrics',
        expect.objectContaining({ activeContributors: 5 }),
        900,
      );
    });
  });

  describe('getRewardMethodology', () => {
    it('returns reward methodology static content', () => {
      const result = service.getRewardMethodology();

      expect(result).toEqual(REWARD_METHODOLOGY);
      expect(result.overview).toContain('scaling-law');
      expect(result.scalingCurve).toHaveLength(5);
      expect(result.formulaComponents).toHaveLength(4);
      expect(result.glossary).toHaveLength(4);
    });
  });
});
