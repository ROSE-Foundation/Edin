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

const EDITION_ID = '11111111-1111-1111-1111-111111111111';
const ARCHIVED_EDITION_ID = '22222222-2222-2222-2222-222222222222';
const ITEM_1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ITEM_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ITEM_3_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MISSING_ITEM_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EDITOR_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const mockEdition = {
  id: EDITION_ID,
  editionNumber: 5,
  status: 'PUBLISHED',
  temporalSpanStart: new Date('2026-03-20T10:00:00Z'),
  temporalSpanEnd: new Date('2026-03-22T18:00:00Z'),
  eventCount: 8,
  eventDensity: {
    toNumber: () => 0.1429,
    toString: () => '0.1429',
    valueOf: () => 0.1429,
  } as unknown,
  significanceDistribution: { tier1: 3, tier2: 3, tier3: 2 },
  referenceScaleMetadata: {
    temporal_span_human_readable: 'covers 2 days of activity, Mar 20–22',
    significance_summary: '2 collaborations, 3 communities, 3 events',
    comparison_context: 'Normal activity',
  },
  publishedAt: new Date('2026-03-22T18:05:00Z'),
  createdAt: new Date('2026-03-22T18:00:00Z'),
  updatedAt: new Date('2026-03-22T18:05:00Z'),
};

const archivedEdition = {
  ...mockEdition,
  id: ARCHIVED_EDITION_ID,
  status: 'ARCHIVED',
};

const mockItems = [
  { id: ITEM_1_ID, editionId: EDITION_ID, editorialRankOverride: null },
  { id: ITEM_2_ID, editionId: EDITION_ID, editorialRankOverride: null },
  { id: ITEM_3_ID, editionId: EDITION_ID, editorialRankOverride: 2 },
];

const mockTransactionClient = {
  newspaperItem: {
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

const mockPrisma = {
  newspaperEdition: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  newspaperItem: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => {
    await cb(mockTransactionClient);
  }),
};

const mockIntrinsicTimeService = {
  computeDensityComparison: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('NewspaperController — Editorial Curation', () => {
  let controller: NewspaperController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [NewspaperController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntrinsicTimeService, useValue: mockIntrinsicTimeService },
        { provide: AuditService, useValue: mockAuditService },
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

  describe('PATCH /editions/:editionId/curation', () => {
    it('returns 404 for non-existent edition', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(null);

      await expect(
        controller.updateEditorialCuration(
          'non-existent',
          { items: [{ itemId: ITEM_1_ID, editorialRankOverride: 1 }] },
          EDITOR_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects ARCHIVED editions', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(archivedEdition);

      await expect(
        controller.updateEditorialCuration(
          ARCHIVED_EDITION_ID,
          { items: [{ itemId: ITEM_1_ID, editorialRankOverride: 1 }] },
          EDITOR_ID,
        ),
      ).rejects.toThrow('Only PUBLISHED or DRAFT editions can be curated');
    });

    it('rejects invalid payload (empty items)', async () => {
      await expect(
        controller.updateEditorialCuration(EDITION_ID, { items: [] }, EDITOR_ID),
      ).rejects.toThrow('Invalid editorial curation payload');
    });

    it('rejects items not belonging to the edition', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue([mockItems[0]]);

      await expect(
        controller.updateEditorialCuration(
          EDITION_ID,
          {
            items: [
              { itemId: ITEM_1_ID, editorialRankOverride: 1 },
              { itemId: MISSING_ITEM_ID, editorialRankOverride: 2 },
            ],
          },
          EDITOR_ID,
        ),
      ).rejects.toThrow('Items not found in edition');
    });

    it('applies editorial rank overrides in a transaction', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue(mockItems);

      const result = await controller.updateEditorialCuration(
        EDITION_ID,
        {
          items: [
            { itemId: ITEM_1_ID, editorialRankOverride: 1 },
            { itemId: ITEM_2_ID, editorialRankOverride: 3 },
          ],
        },
        EDITOR_ID,
      );

      expect(result.data.editionId).toBe(EDITION_ID);
      expect(result.data.updatedItems).toHaveLength(2);
      expect(result.data.updatedItems[0]).toEqual({
        itemId: ITEM_1_ID,
        previousRank: null,
        newRank: 1,
      });
      expect(result.data.updatedItems[1]).toEqual({
        itemId: ITEM_2_ID,
        previousRank: null,
        newRank: 3,
      });

      // Verify transaction was used
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionClient.newspaperItem.update).toHaveBeenCalledTimes(2);
    });

    it('creates audit log entry on curation', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue(mockItems);

      await controller.updateEditorialCuration(
        EDITION_ID,
        {
          items: [{ itemId: ITEM_1_ID, editorialRankOverride: 1 }],
        },
        EDITOR_ID,
      );

      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const auditCall = mockAuditService.log.mock.calls[0][0];
      expect(auditCall.actorId).toBe(EDITOR_ID);
      expect(auditCall.action).toBe('NEWSPAPER_EDITORIAL_CURATION');
      expect(auditCall.entityType).toBe('NEWSPAPER_EDITION');
      expect(auditCall.entityId).toBe(EDITION_ID);
      expect(auditCall.details.itemChanges).toHaveLength(1);
    });

    it('resets editorial override when set to null', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue(mockItems);

      const result = await controller.updateEditorialCuration(
        EDITION_ID,
        {
          items: [{ itemId: ITEM_3_ID, editorialRankOverride: null }],
        },
        EDITOR_ID,
      );

      expect(result.data.updatedItems[0]).toEqual({
        itemId: ITEM_3_ID,
        previousRank: 2,
        newRank: null,
      });
    });

    it('handles bulk update with multiple items', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
      mockPrisma.newspaperItem.findMany.mockResolvedValue(mockItems);

      const result = await controller.updateEditorialCuration(
        EDITION_ID,
        {
          items: [
            { itemId: ITEM_1_ID, editorialRankOverride: 3 },
            { itemId: ITEM_2_ID, editorialRankOverride: 1 },
            { itemId: ITEM_3_ID, editorialRankOverride: 2 },
          ],
        },
        EDITOR_ID,
      );

      expect(result.data.updatedItems).toHaveLength(3);
      expect(mockTransactionClient.newspaperItem.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET /editions/:editionId/audit', () => {
    it('returns 404 for non-existent edition', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue(null);

      await expect(controller.getEditorialAuditHistory('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns audit entries for edition', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue({ id: EDITION_ID });
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          actorId: EDITOR_ID,
          actorRole: 'EDITOR',
          entityType: 'NEWSPAPER_EDITION',
          entityId: EDITION_ID,
          action: 'NEWSPAPER_EDITORIAL_CURATION',
          details: {
            itemChanges: [{ itemId: ITEM_1_ID, previousRank: null, newRank: 1 }],
          },
          createdAt: new Date('2026-03-25T10:00:00Z'),
        },
      ]);

      const result = await controller.getEditorialAuditHistory(EDITION_ID);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].editorId).toBe(EDITOR_ID);
      expect(result.data[0].editorRole).toBe('EDITOR');
      expect(result.data[0].itemChanges).toHaveLength(1);
    });

    it('returns empty array when no audit entries exist', async () => {
      mockPrisma.newspaperEdition.findUnique.mockResolvedValue({ id: EDITION_ID });
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await controller.getEditorialAuditHistory(EDITION_ID);

      expect(result.data).toEqual([]);
    });
  });
});
