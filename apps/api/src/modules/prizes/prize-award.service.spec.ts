import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { PrizeAwardService } from './prize-award.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockCategory = {
  id: 'cat-1',
  name: 'Cross-Domain Collaboration',
  detectionType: 'AUTOMATED',
};
const mockChannel = { id: 'ch-1', name: 'Technology', type: 'DOMAIN' };
const mockContributor = { id: 'contrib-1', name: 'Jane Doe' };

const mockAward = {
  id: 'award-1',
  prizeCategoryId: 'cat-1',
  recipientContributorId: 'contrib-1',
  contributionId: 'contribution-1',
  significanceLevel: 2,
  channelId: 'ch-1',
  chathamHouseLabel: 'a technology expert',
  narrative: 'Awarded for outstanding cross-domain collaboration between Technology and Finance.',
  awardedAt: new Date('2026-03-20T10:00:00Z'),
  metadata: null,
  prizeCategory: mockCategory,
  channel: mockChannel,
  recipient: mockContributor,
};

describe('PrizeAwardService', () => {
  let service: PrizeAwardService;
  let prisma: {
    prizeAward: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    prizeCategory: {
      findMany: ReturnType<typeof vi.fn>;
    };
    channel: {
      findMany: ReturnType<typeof vi.fn>;
    };
    contributor: {
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      prizeAward: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      prizeCategory: {
        findMany: vi.fn(),
      },
      channel: {
        findMany: vi.fn(),
      },
      contributor: {
        count: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [PrizeAwardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PrizeAwardService);
  });

  describe('findByContributor', () => {
    it('returns awards ordered by awardedAt DESC with relations', async () => {
      prisma.prizeAward.findMany.mockResolvedValue([mockAward]);

      const result = await service.findByContributor('contrib-1');

      expect(result).toEqual([mockAward]);
      expect(prisma.prizeAward.findMany).toHaveBeenCalledWith({
        where: { recipientContributorId: 'contrib-1' },
        include: {
          prizeCategory: { select: { id: true, name: true, detectionType: true } },
          channel: { select: { id: true, name: true, type: true } },
        },
        orderBy: { awardedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('returns empty array when contributor has no awards', async () => {
      prisma.prizeAward.findMany.mockResolvedValue([]);

      const result = await service.findByContributor('contrib-no-awards');

      expect(result).toEqual([]);
    });

    it('applies limit and offset options', async () => {
      prisma.prizeAward.findMany.mockResolvedValue([mockAward]);

      await service.findByContributor('contrib-1', { limit: 10, offset: 5 });

      expect(prisma.prizeAward.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 5 }),
      );
    });
  });

  describe('findPublicByContributor', () => {
    it('returns public-safe fields only', async () => {
      const publicAward = {
        id: 'award-1',
        significanceLevel: 2,
        chathamHouseLabel: 'a technology expert',
        narrative: 'Cross-domain collaboration.',
        awardedAt: new Date('2026-03-20T10:00:00Z'),
        prizeCategory: { id: 'cat-1', name: 'Cross-Domain Collaboration' },
        channel: { id: 'ch-1', name: 'Technology' },
      };
      prisma.prizeAward.findMany.mockResolvedValue([publicAward]);

      const result = await service.findPublicByContributor('contrib-1');

      expect(result).toEqual([publicAward]);
      expect(prisma.prizeAward.findMany).toHaveBeenCalledWith({
        where: { recipientContributorId: 'contrib-1' },
        select: {
          id: true,
          significanceLevel: true,
          chathamHouseLabel: true,
          narrative: true,
          awardedAt: true,
          prizeCategory: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
        orderBy: { awardedAt: 'desc' },
      });
    });

    it('returns empty array when no public awards exist', async () => {
      prisma.prizeAward.findMany.mockResolvedValue([]);

      const result = await service.findPublicByContributor('contrib-none');

      expect(result).toEqual([]);
    });
  });

  describe('countByContributor', () => {
    it('returns the count of awards for a contributor', async () => {
      prisma.prizeAward.count.mockResolvedValue(3);

      const result = await service.countByContributor('contrib-1');

      expect(result).toBe(3);
      expect(prisma.prizeAward.count).toHaveBeenCalledWith({
        where: { recipientContributorId: 'contrib-1' },
      });
    });

    it('returns 0 for contributor with no awards', async () => {
      prisma.prizeAward.count.mockResolvedValue(0);

      const result = await service.countByContributor('contrib-none');

      expect(result).toBe(0);
    });
  });

  describe('contributorExists', () => {
    it('returns true when contributor exists', async () => {
      prisma.contributor.count.mockResolvedValue(1);

      const result = await service.contributorExists('contrib-1');

      expect(result).toBe(true);
      expect(prisma.contributor.count).toHaveBeenCalledWith({
        where: { id: 'contrib-1' },
      });
    });

    it('returns false when contributor does not exist', async () => {
      prisma.contributor.count.mockResolvedValue(0);

      const result = await service.contributorExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getAdminOverview', () => {
    it('returns aggregate overview with enriched names', async () => {
      prisma.prizeAward.groupBy
        .mockResolvedValueOnce([{ prizeCategoryId: 'cat-1', _count: { id: 5 } }])
        .mockResolvedValueOnce([{ channelId: 'ch-1', _count: { id: 3 } }]);
      prisma.prizeAward.findMany.mockResolvedValue([
        {
          ...mockAward,
          recipient: mockContributor,
        },
      ]);
      prisma.prizeAward.count.mockResolvedValue(2);
      prisma.prizeCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Cross-Domain Collaboration' },
      ]);
      prisma.channel.findMany.mockResolvedValue([{ id: 'ch-1', name: 'Technology' }]);

      const result = await service.getAdminOverview();

      expect(result.totalByCategory).toEqual([
        { prizeCategoryId: 'cat-1', prizeCategoryName: 'Cross-Domain Collaboration', count: 5 },
      ]);
      expect(result.totalByChannel).toEqual([
        { channelId: 'ch-1', channelName: 'Technology', count: 3 },
      ]);
      expect(result.recentAwards).toHaveLength(1);
      expect(result.recentAwards[0].contributorName).toBe('Jane Doe');
      expect(result.recentAwards[0].awardedAt).toBe('2026-03-20T10:00:00.000Z');
      expect(result.last30DaysCount).toBe(2);
    });

    it('uses null guards for orphaned relations in recentAwards', async () => {
      const orphanedAward = {
        ...mockAward,
        recipient: null,
        prizeCategory: null,
        channel: null,
      };
      prisma.prizeAward.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prizeAward.findMany.mockResolvedValue([orphanedAward]);
      prisma.prizeAward.count.mockResolvedValue(1);

      const result = await service.getAdminOverview();

      expect(result.recentAwards[0].contributorName).toBe('Unknown');
      expect(result.recentAwards[0].prizeCategoryName).toBe('Unknown');
      expect(result.recentAwards[0].channelName).toBe('Unknown');
    });

    it('handles empty state with no awards', async () => {
      prisma.prizeAward.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prizeAward.findMany.mockResolvedValue([]);
      prisma.prizeAward.count.mockResolvedValue(0);

      const result = await service.getAdminOverview();

      expect(result.totalByCategory).toEqual([]);
      expect(result.totalByChannel).toEqual([]);
      expect(result.recentAwards).toEqual([]);
      expect(result.last30DaysCount).toBe(0);
      // Should not query for names when no groupBy results
      expect(prisma.prizeCategory.findMany).not.toHaveBeenCalled();
      expect(prisma.channel.findMany).not.toHaveBeenCalled();
    });
  });
});
