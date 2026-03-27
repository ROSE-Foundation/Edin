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
  eventDensity: {
    toNumber: () => 0.1429,
    toString: () => '0.1429',
    valueOf: () => 0.1429,
  } as unknown,
  significanceDistribution: { tier1: 3, tier2: 3, tier3: 2 },
  referenceScaleMetadata: {
    temporal_span_human_readable: 'covers 2 days of activity, Mar 20–22',
    significance_summary: '2 collaborations, 3 communities, 3 events',
    comparison_context: 'High activity — 2.5x the 30-day average density',
  },
  publishedAt: new Date('2026-03-22T18:05:00Z'),
  createdAt: new Date('2026-03-22T18:00:00Z'),
  updatedAt: new Date('2026-03-22T18:05:00Z'),
};

const quietEdition = {
  ...mockEdition,
  id: 'edition-quiet',
  editionNumber: 6,
  eventCount: 2,
  eventDensity: { toNumber: () => 0.012, toString: () => '0.012', valueOf: () => 0.012 } as unknown,
  referenceScaleMetadata: {
    temporal_span_human_readable: 'covers 7 days of activity, Mar 15–22',
    significance_summary: '2 events',
    comparison_context: 'Low activity period — below average density',
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
  },
};

const mockIntrinsicTimeService = {
  computeDensityComparison: vi.fn(),
};

describe('NewspaperController — GET /editions/:id/scale', () => {
  let controller: NewspaperController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [NewspaperController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntrinsicTimeService, useValue: mockIntrinsicTimeService },
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

  it('returns 404 for non-existent edition', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(null);

    await expect(controller.getEditionScale('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('returns correct scale data for a PUBLISHED edition', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
    mockIntrinsicTimeService.computeDensityComparison.mockResolvedValue({
      activityLevel: 'high',
      densityRatio: 2.5,
    });

    const result = await controller.getEditionScale('edition-1');

    expect(result.data.editionId).toBe('edition-1');
    expect(result.data.editionNumber).toBe(5);
    expect(result.data.eventCount).toBe(8);
    expect(result.data.significanceDistribution).toEqual({ tier1: 3, tier2: 3, tier3: 2 });
    expect(result.data.referenceScaleMetadata.temporalSpanHumanReadable).toBe(
      'covers 2 days of activity, Mar 20–22',
    );
    expect(result.data.referenceScaleMetadata.significanceSummary).toBe(
      '2 collaborations, 3 communities, 3 events',
    );
  });

  it('derives activityLevel correctly — high', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
    mockIntrinsicTimeService.computeDensityComparison.mockResolvedValue({
      activityLevel: 'high',
      densityRatio: 2.5,
    });

    const result = await controller.getEditionScale('edition-1');

    expect(result.data.activityLevel).toBe('high');
    expect(result.data.densityRatio).toBe(2.5);
  });

  it('derives activityLevel correctly — above-average', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
    mockIntrinsicTimeService.computeDensityComparison.mockResolvedValue({
      activityLevel: 'above-average',
      densityRatio: 1.8,
    });

    const result = await controller.getEditionScale('edition-1');

    expect(result.data.activityLevel).toBe('above-average');
    expect(result.data.densityRatio).toBe(1.8);
  });

  it('derives isQuietPeriod correctly from metadata', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(quietEdition);

    const result = await controller.getEditionScale('edition-quiet');

    expect(result.data.isQuietPeriod).toBe(true);
    expect(result.data.activityLevel).toBe('low');
    expect(result.data.densityRatio).toBeNull();
    // Should NOT call computeDensityComparison for quiet period editions
    expect(mockIntrinsicTimeService.computeDensityComparison).not.toHaveBeenCalled();
  });

  it('sets isQuietPeriod to false for normal editions', async () => {
    mockPrisma.newspaperEdition.findUnique.mockResolvedValue(mockEdition);
    mockIntrinsicTimeService.computeDensityComparison.mockResolvedValue({
      activityLevel: 'normal',
      densityRatio: 1.0,
    });

    const result = await controller.getEditionScale('edition-1');

    expect(result.data.isQuietPeriod).toBe(false);
    expect(mockIntrinsicTimeService.computeDensityComparison).toHaveBeenCalledWith(
      0.1429,
      'edition-1',
    );
  });
});
