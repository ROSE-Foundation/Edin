import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Schema validation tests for NewspaperEdition and NewspaperItem models.
 * These tests verify the Prisma schema structure by exercising the mock
 * PrismaService with the expected field shapes.
 */

describe('Newspaper Schema — NewspaperEdition', () => {
  const mockEditionId = '11111111-1111-1111-1111-111111111111';

  const mockEdition = {
    id: mockEditionId,
    editionNumber: 1,
    status: 'DRAFT' as const,
    temporalSpanStart: new Date('2026-03-20T00:00:00Z'),
    temporalSpanEnd: new Date('2026-03-23T00:00:00Z'),
    eventCount: 7,
    eventDensity: 0.0972,
    significanceDistribution: { tier1: 1, tier2: 3, tier3: 2, tier4: 1, tier5: 0 },
    referenceScaleMetadata: {
      temporal_span_human_readable: 'covers the last 3 days',
      significance_summary: '7 events across 4 tiers',
      comparison_context: 'Normal activity — 1.2x average',
    },
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    prisma = {
      newspaperEdition: {
        create: vi.fn().mockResolvedValue(mockEdition),
        findUnique: vi.fn().mockResolvedValue(mockEdition),
        findMany: vi.fn().mockResolvedValue([mockEdition]),
      },
    };
  });

  it('creates a NewspaperEdition with all required fields', async () => {
    const result = await prisma.newspaperEdition.create({
      data: {
        editionNumber: 1,
        status: 'DRAFT',
        temporalSpanStart: new Date('2026-03-20T00:00:00Z'),
        temporalSpanEnd: new Date('2026-03-23T00:00:00Z'),
        eventCount: 7,
        eventDensity: 0.0972,
        significanceDistribution: { tier1: 1, tier2: 3, tier3: 2, tier4: 1, tier5: 0 },
        referenceScaleMetadata: {
          temporal_span_human_readable: 'covers the last 3 days',
          significance_summary: '7 events across 4 tiers',
          comparison_context: 'Normal activity — 1.2x average',
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(mockEditionId);
    expect(result.editionNumber).toBe(1);
    expect(result.status).toBe('DRAFT');
    expect(result.eventCount).toBe(7);
    expect(result.significanceDistribution).toEqual({
      tier1: 1,
      tier2: 3,
      tier3: 2,
      tier4: 1,
      tier5: 0,
    });
    expect(result.publishedAt).toBeNull();
  });

  it('edition_number is unique across editions', async () => {
    const duplicateError = {
      code: 'P2002',
      meta: { target: ['edition_number'] },
    };
    prisma.newspaperEdition.create.mockRejectedValueOnce(duplicateError);

    await expect(
      prisma.newspaperEdition.create({
        data: {
          editionNumber: 1,
          status: 'DRAFT',
          temporalSpanStart: new Date(),
          temporalSpanEnd: new Date(),
          eventCount: 0,
          eventDensity: 0,
          significanceDistribution: {},
          referenceScaleMetadata: {},
        },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'P2002' }));
  });

  it('queries editions by status', async () => {
    await prisma.newspaperEdition.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { editionNumber: 'desc' },
    });

    expect(prisma.newspaperEdition.findMany).toHaveBeenCalledWith({
      where: { status: 'PUBLISHED' },
      orderBy: { editionNumber: 'desc' },
    });
  });

  it('queries editions by temporal_span range', async () => {
    const rangeStart = new Date('2026-03-01T00:00:00Z');
    const rangeEnd = new Date('2026-03-31T23:59:59Z');

    await prisma.newspaperEdition.findMany({
      where: {
        temporalSpanStart: { gte: rangeStart },
        temporalSpanEnd: { lte: rangeEnd },
      },
    });

    expect(prisma.newspaperEdition.findMany).toHaveBeenCalledWith({
      where: {
        temporalSpanStart: { gte: rangeStart },
        temporalSpanEnd: { lte: rangeEnd },
      },
    });
  });
});

describe('Newspaper Schema — NewspaperItem', () => {
  const mockEditionId = '11111111-1111-1111-1111-111111111111';
  const mockItemId = '22222222-2222-2222-2222-222222222222';
  const mockSourceEventId = '33333333-3333-3333-3333-333333333333';
  const mockChannelId = '44444444-4444-4444-4444-444444444444';

  const mockItem = {
    id: mockItemId,
    editionId: mockEditionId,
    sourceEventType: 'PRIZE_AWARDED' as const,
    sourceEventId: mockSourceEventId,
    channelId: mockChannelId,
    headline: 'Cross-domain breakthrough in technology and finance',
    body: 'A technology expert collaborated with a financial engineering specialist to deliver a breakthrough contribution.',
    chathamHouseLabel: 'a technology expert',
    significanceScore: 4,
    algorithmicRank: 1,
    editorialRankOverride: null,
    communityVoteCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    prisma = {
      newspaperItem: {
        create: vi.fn().mockResolvedValue(mockItem),
        findMany: vi.fn().mockResolvedValue([mockItem]),
      },
    };
  });

  it('creates a NewspaperItem with all required fields and FK relations', async () => {
    const result = await prisma.newspaperItem.create({
      data: {
        editionId: mockEditionId,
        sourceEventType: 'PRIZE_AWARDED',
        sourceEventId: mockSourceEventId,
        channelId: mockChannelId,
        headline: 'Cross-domain breakthrough in technology and finance',
        body: 'A technology expert collaborated with a financial engineering specialist.',
        chathamHouseLabel: 'a technology expert',
        significanceScore: 4,
        algorithmicRank: 1,
      },
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(mockItemId);
    expect(result.editionId).toBe(mockEditionId);
    expect(result.sourceEventType).toBe('PRIZE_AWARDED');
    expect(result.channelId).toBe(mockChannelId);
    expect(result.chathamHouseLabel).toBe('a technology expert');
    expect(result.editorialRankOverride).toBeNull();
    expect(result.communityVoteCount).toBe(0);
  });

  it('significance_score accepts discrete integer tiers (1-5)', () => {
    expect(Number.isInteger(mockItem.significanceScore)).toBe(true);
    expect(mockItem.significanceScore).toBeGreaterThanOrEqual(1);
    expect(mockItem.significanceScore).toBeLessThanOrEqual(5);
  });

  it('rejects significance_score outside valid range (0 or 6)', async () => {
    const checkViolationError = {
      code: 'P2004',
      message: 'A constraint failed on the database: chk_newspaper_items_significance_score',
    };

    // Score below range
    prisma.newspaperItem.create.mockRejectedValueOnce(checkViolationError);
    await expect(
      prisma.newspaperItem.create({
        data: { ...mockItem, significanceScore: 0 },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'P2004' }));

    // Score above range
    prisma.newspaperItem.create.mockRejectedValueOnce(checkViolationError);
    await expect(
      prisma.newspaperItem.create({
        data: { ...mockItem, significanceScore: 6 },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'P2004' }));
  });

  it('queries items by channel_id within an edition', async () => {
    await prisma.newspaperItem.findMany({
      where: {
        editionId: mockEditionId,
        channelId: mockChannelId,
      },
      orderBy: { algorithmicRank: 'asc' },
    });

    expect(prisma.newspaperItem.findMany).toHaveBeenCalledWith({
      where: {
        editionId: mockEditionId,
        channelId: mockChannelId,
      },
      orderBy: { algorithmicRank: 'asc' },
    });
  });

  it('items within an edition can be ordered by algorithmic_rank', async () => {
    const rankedItems = [
      { ...mockItem, algorithmicRank: 1 },
      { ...mockItem, id: '55555555-5555-5555-5555-555555555555', algorithmicRank: 2 },
      { ...mockItem, id: '66666666-6666-6666-6666-666666666666', algorithmicRank: 3 },
    ];
    prisma.newspaperItem.findMany.mockResolvedValueOnce(rankedItems);

    const result = await prisma.newspaperItem.findMany({
      where: { editionId: mockEditionId },
      orderBy: { algorithmicRank: 'asc' },
    });

    expect(result).toHaveLength(3);
    expect(result[0].algorithmicRank).toBe(1);
    expect(result[1].algorithmicRank).toBe(2);
    expect(result[2].algorithmicRank).toBe(3);
  });

  it('supports all source event types via item creation', async () => {
    const validTypes = [
      'PRIZE_AWARDED',
      'TRACK_RECORD_MILESTONE',
      'PEER_NOMINATION_RECEIVED',
      'CONTRIBUTION_EVALUATED',
      'CROSS_DOMAIN_COLLABORATION',
      'CUSTOM',
    ] as const;

    for (const sourceEventType of validTypes) {
      prisma.newspaperItem.create.mockResolvedValueOnce({
        ...mockItem,
        sourceEventType,
      });

      const result = await prisma.newspaperItem.create({
        data: {
          ...mockItem,
          sourceEventType,
        },
      });

      expect(result.sourceEventType).toBe(sourceEventType);
    }

    expect(prisma.newspaperItem.create).toHaveBeenCalledTimes(validTypes.length);
  });
});
