import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';
import { NewspaperController } from '../newspaper.controller.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { IntrinsicTimeService } from '../intrinsic-time.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { NewspaperItemVotingService } from '../newspaper-item-voting.service.js';
import { CaslAbilityFactory } from '../../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../../common/guards/ability.guard.js';

const mockEdition = {
  id: 'edition-1',
  editionNumber: 5,
  status: 'PUBLISHED',
  temporalSpanStart: new Date('2026-03-20T10:00:00Z'),
  temporalSpanEnd: new Date('2026-03-22T18:00:00Z'),
  eventCount: 8,
  eventDensity: { toNumber: () => 0.1429 } as unknown,
  significanceDistribution: { '1': 3, '2': 3, '3': 2 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers the last 2 days',
    significanceSummary: '2 breakthroughs, 3 collaborations, 3 milestones',
    comparisonContext: 'high-activity edition — 2x the 30-day average',
  },
  publishedAt: new Date('2026-03-22T18:05:00Z'),
  createdAt: new Date('2026-03-22T18:00:00Z'),
  updatedAt: new Date('2026-03-22T18:05:00Z'),
};

const mockItem = {
  id: 'item-1',
  editionId: 'edition-1',
  sourceEventType: 'PRIZE_AWARDED',
  sourceEventId: 'event-1',
  channelId: 'channel-1',
  channel: { name: 'Technology' },
  headline: 'Cross-Domain Collaboration Prize Awarded',
  body: 'A technology and finance specialist bridged two domains',
  chathamHouseLabel: 'a technology and finance specialist',
  significanceScore: 3,
  algorithmicRank: 1,
  editorialRankOverride: null,
  communityVoteCount: 0,
  createdAt: new Date('2026-03-22T17:30:00Z'),
  updatedAt: new Date('2026-03-22T17:30:00Z'),
};

const mockItem2 = {
  ...mockItem,
  id: 'item-2',
  sourceEventType: 'TRACK_RECORD_MILESTONE',
  headline: '6-Month Consistent Contributor Milestone',
  body: 'A governance expert reached the 6-month consistency milestone',
  chathamHouseLabel: 'a governance expert',
  significanceScore: 2,
  algorithmicRank: 2,
  channelId: 'channel-2',
  channel: { name: 'Governance' },
};

const mockPrisma = {
  newspaperEdition: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  newspaperItem: {
    findMany: vi.fn(),
  },
  channel: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

describe('NewspaperController', () => {
  let controller: NewspaperController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [NewspaperController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntrinsicTimeService, useValue: { computeDensityComparison: vi.fn() } },
        { provide: AuditService, useValue: { log: vi.fn() } },
        {
          provide: NewspaperItemVotingService,
          useValue: { castVote: vi.fn(), hasVoted: vi.fn(), getVotedItemIds: vi.fn() },
        },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
      ],
    }).compile();

    controller = module.get(NewspaperController);
  });

  describe('GET /newspaper/editions', () => {
    it('returns paginated published editions ordered by editionNumber DESC', async () => {
      const editions = [
        { ...mockEdition, _count: { items: 8 } },
        { ...mockEdition, id: 'edition-2', editionNumber: 4, _count: { items: 5 } },
      ];
      mockPrisma.newspaperEdition.findMany.mockResolvedValue(editions);
      mockPrisma.newspaperEdition.count.mockResolvedValue(2);

      const result = await controller.listEditions({ limit: '20' });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('correlationId');
      expect(result.meta).toHaveProperty('pagination');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].editionNumber).toBe(5);
      expect(result.data[0].itemCount).toBe(8);
    });

    it('respects cursor and limit params', async () => {
      mockPrisma.newspaperEdition.findMany.mockResolvedValue([]);
      mockPrisma.newspaperEdition.count.mockResolvedValue(0);

      await controller.listEditions({ cursor: '4|edition-2', limit: '5' });

      expect(mockPrisma.newspaperEdition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 6,
          where: expect.objectContaining({
            status: 'PUBLISHED',
            OR: [{ editionNumber: { lt: 4 } }, { editionNumber: 4, id: { lt: 'edition-2' } }],
          }),
        }),
      );
    });

    it('indicates hasMore when more editions exist', async () => {
      const threeEditions = [
        { ...mockEdition, _count: { items: 8 } },
        { ...mockEdition, id: 'edition-2', editionNumber: 4, _count: { items: 5 } },
        { ...mockEdition, id: 'edition-3', editionNumber: 3, _count: { items: 3 } },
      ];
      mockPrisma.newspaperEdition.findMany.mockResolvedValue(threeEditions);
      mockPrisma.newspaperEdition.count.mockResolvedValue(5);

      const result = await controller.listEditions({ limit: '2' });

      expect(result.data).toHaveLength(2);
      expect(result.meta.pagination?.hasMore).toBe(true);
      expect(result.meta.pagination?.cursor).toBe('4|edition-2');
    });

    it('rejects invalid query parameters', async () => {
      await expect(controller.listEditions({ limit: 'invalid' })).rejects.toThrow();
    });
  });

  describe('GET /newspaper/editions/latest', () => {
    it('returns latest PUBLISHED edition with items', async () => {
      mockPrisma.newspaperEdition.findFirst.mockResolvedValue({
        ...mockEdition,
        items: [mockItem, mockItem2],
      });

      const result = await controller.getLatestEdition();

      expect(result.data.editionNumber).toBe(5);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].headline).toBe('Cross-Domain Collaboration Prize Awarded');
      expect(result.data.items[0].chathamHouseLabel).toBe('a technology and finance specialist');
      expect(result.data.items[0].channelName).toBe('Technology');
      expect(result.data.items[0].rank).toBe(1);
    });

    it('returns 404 when no published editions exist', async () => {
      mockPrisma.newspaperEdition.findFirst.mockResolvedValue(null);

      await expect(controller.getLatestEdition()).rejects.toThrow(NotFoundException);
    });

    it('maps reference scale metadata correctly', async () => {
      mockPrisma.newspaperEdition.findFirst.mockResolvedValue({
        ...mockEdition,
        items: [],
      });

      const result = await controller.getLatestEdition();

      expect(result.data.referenceScaleMetadata.temporalSpanHumanReadable).toBe(
        'covers the last 2 days',
      );
      expect(result.data.referenceScaleMetadata.significanceSummary).toBe(
        '2 breakthroughs, 3 collaborations, 3 milestones',
      );
      expect(result.data.referenceScaleMetadata.comparisonContext).toBe(
        'high-activity edition — 2x the 30-day average',
      );
    });

    it('includes channels array with per-edition item counts', async () => {
      mockPrisma.newspaperEdition.findFirst.mockResolvedValue({
        ...mockEdition,
        items: [mockItem, mockItem2],
      });
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'channel-1', name: 'Technology', type: 'DOMAIN' },
        { id: 'channel-2', name: 'Governance', type: 'DOMAIN' },
        { id: 'channel-3', name: 'Finance', type: 'DOMAIN' },
      ]);

      const result = await controller.getLatestEdition();

      expect(result.data.channels).toBeDefined();
      expect(result.data.channels).toHaveLength(3);

      const techChannel = result.data.channels!.find(
        (c: { channelId: string }) => c.channelId === 'channel-1',
      );
      expect(techChannel).toEqual({
        channelId: 'channel-1',
        channelName: 'Technology',
        channelType: 'DOMAIN',
        itemCount: 1,
      });

      // Finance channel exists but has no items in this edition
      const financeChannel = result.data.channels!.find(
        (c: { channelId: string }) => c.channelId === 'channel-3',
      );
      expect(financeChannel).toEqual({
        channelId: 'channel-3',
        channelName: 'Finance',
        channelType: 'DOMAIN',
        itemCount: 0,
      });
    });
  });

  describe('GET /newspaper/editions/:id/items', () => {
    it('returns items and channels in response', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItem, mockItem2]);
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'channel-1', name: 'Technology', type: 'DOMAIN' },
        { id: 'channel-2', name: 'Governance', type: 'DOMAIN' },
      ]);

      const result = await controller.getEditionItems('edition-1', {});

      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0].rank).toBe(1);
      expect(result.data.items[1].rank).toBe(2);
      expect(result.data.channels).toBeDefined();
      expect(result.data.channels).toHaveLength(2);
    });

    it('includes channels with per-edition item counts', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItem, mockItem2]);
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'channel-1', name: 'Technology', type: 'DOMAIN' },
        { id: 'channel-2', name: 'Governance', type: 'DOMAIN' },
        { id: 'channel-3', name: 'Finance', type: 'DOMAIN' },
      ]);

      const result = await controller.getEditionItems('edition-1', {});

      const techChannel = result.data.channels.find(
        (c: { channelId: string }) => c.channelId === 'channel-1',
      );
      expect(techChannel).toEqual({
        channelId: 'channel-1',
        channelName: 'Technology',
        channelType: 'DOMAIN',
        itemCount: 1,
      });
      // Finance channel has zero items
      const financeChannel = result.data.channels.find(
        (c: { channelId: string }) => c.channelId === 'channel-3',
      );
      expect(financeChannel?.itemCount).toBe(0);
    });

    it('filters by channelId query param', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItem]);
      mockPrisma.channel.findMany.mockResolvedValue([]);

      await controller.getEditionItems('edition-1', {
        channelId: '00000000-0000-0000-0000-000000000001',
      });

      // First call is filtered items; second call is unfiltered for channel counts
      expect(mockPrisma.newspaperItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            editionId: 'edition-1',
            channelId: '00000000-0000-0000-0000-000000000001',
          }),
        }),
      );
    });

    it('returns 404 for non-existent edition', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(null);

      await expect(controller.getEditionItems('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('uses editorial rank override when present', async () => {
      const itemWithOverride = { ...mockItem2, algorithmicRank: 3, editorialRankOverride: 1 };
      const itemWithoutOverride = { ...mockItem, algorithmicRank: 2, editorialRankOverride: null };
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([itemWithoutOverride, itemWithOverride]);
      mockPrisma.channel.findMany.mockResolvedValue([]);

      const result = await controller.getEditionItems('edition-1', {});

      expect(result.data.items[0].id).toBe('item-2');
      expect(result.data.items[0].rank).toBe(1);
      expect(result.data.items[1].id).toBe('item-1');
      expect(result.data.items[1].rank).toBe(2);
    });

    it('filters by multiple comma-separated channelIds (OR logic)', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItem, mockItem2]);
      mockPrisma.channel.findMany.mockResolvedValue([]);

      await controller.getEditionItems('edition-1', {
        channelId: '00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002',
      });

      expect(mockPrisma.newspaperItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            editionId: 'edition-1',
            channelId: {
              in: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
            },
          }),
        }),
      );
    });

    it('returns all items when no channelId filter is provided', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItem, mockItem2]);
      mockPrisma.channel.findMany.mockResolvedValue([]);

      const result = await controller.getEditionItems('edition-1', {});

      expect(result.data.items).toHaveLength(2);
      expect(mockPrisma.newspaperItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { editionId: 'edition-1' },
        }),
      );
    });

    it('channel counts reflect full edition regardless of channel filter', async () => {
      // When channel filter is active, channel counts should still reflect the full edition
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      // First call: filtered items (only channel-1)
      // Second call: all items for channel counts
      mockPrisma.newspaperItem.findMany
        .mockResolvedValueOnce([mockItem]) // filtered items query
        .mockResolvedValueOnce([mockItem, mockItem2]); // unfiltered channel count query
      mockPrisma.channel.findMany.mockResolvedValue([
        { id: 'channel-1', name: 'Technology', type: 'DOMAIN' },
        { id: 'channel-2', name: 'Governance', type: 'DOMAIN' },
      ]);

      const result = await controller.getEditionItems('edition-1', {
        channelId: '00000000-0000-0000-0000-000000000001',
      });

      // Items are filtered
      expect(result.data.items).toHaveLength(1);
      // But channels reflect the full edition
      const techCh = result.data.channels.find(
        (c: { channelId: string }) => c.channelId === 'channel-1',
      );
      const govCh = result.data.channels.find(
        (c: { channelId: string }) => c.channelId === 'channel-2',
      );
      expect(techCh?.itemCount).toBe(1);
      expect(govCh?.itemCount).toBe(1);
    });
  });
});
