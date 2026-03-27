import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackRecordController } from './track-record.controller.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

describe('TrackRecordController', () => {
  let controller: TrackRecordController;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockUser = { id: mockUserId, role: 'CONTRIBUTOR' };

  const mockMilestones = [
    {
      id: 'milestone-1',
      contributorId: mockUserId,
      milestoneType: 'DURATION',
      thresholdName: '3-month active contributor',
      crossedAt: new Date('2026-03-15'),
      outcomes: [
        {
          id: 'outcome-1',
          outcomeType: 'ROLE_ELIGIBILITY',
          outcomeDetails: { description: 'Eligible for expanded roles' },
          status: 'ACTIVE',
          grantedAt: new Date('2026-03-15'),
          expiresAt: null,
        },
      ],
    },
  ];

  const mockEvaluation = {
    id: 'eval-1',
    contributorId: mockUserId,
    consistencyScore: { toString: () => '75.50' },
    engagementDurationMonths: 7,
    contributionCount: 50,
    domainBreadth: 3,
    activeWeeksRatio: { toString: () => '0.80' },
    computedAt: new Date('2026-03-20'),
  };

  const mockThresholdConfigs = [
    {
      id: 'config-1',
      milestoneType: 'DURATION',
      thresholdName: '3-month active contributor',
      thresholdRules: {
        conditions: [
          { field: 'engagement_duration_months', operator: '>=', value: 3 },
          { field: 'active_weeks_ratio', operator: '>=', value: 0.6 },
        ],
      },
      outcomeType: 'ROLE_ELIGIBILITY',
      isActive: true,
    },
    {
      id: 'config-2',
      milestoneType: 'VOLUME',
      thresholdName: 'Century contributor',
      thresholdRules: {
        conditions: [{ field: 'contribution_count', operator: '>=', value: 100 }],
      },
      outcomeType: 'INVITATION',
      isActive: true,
    },
  ];

  beforeEach(async () => {
    prisma = {
      trackRecordMilestone: {
        findMany: vi.fn().mockResolvedValue(mockMilestones),
      },
      trackRecordEvaluation: {
        findFirst: vi.fn().mockResolvedValue(mockEvaluation),
      },
      trackRecordThresholdConfig: {
        findMany: vi.fn().mockResolvedValue(mockThresholdConfigs),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [TrackRecordController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(TrackRecordController);
  });

  it('returns milestones with outcomes for authenticated user', async () => {
    const result = await controller.getMyTrackRecord(mockUser as never);

    expect(result.data.milestones).toHaveLength(1);
    expect(result.data.milestones[0].milestoneType).toBe('DURATION');
    expect(result.data.milestones[0].thresholdName).toBe('3-month active contributor');
    expect(result.data.outcomes).toHaveLength(1);
    expect(result.data.outcomes[0].outcomeType).toBe('ROLE_ELIGIBILITY');
    expect(result.data.outcomes[0].status).toBe('ACTIVE');
  });

  it('returns progress indicators showing discrete steps to next milestone', async () => {
    const result = await controller.getMyTrackRecord(mockUser as never);

    // config-1 (3-month) is already crossed, config-2 (Century) is not
    const centuryProgress = result.data.progress.find(
      (p: { thresholdName: string }) => p.thresholdName === 'Century contributor',
    );
    expect(centuryProgress).toBeDefined();
    expect(centuryProgress!.isCrossed).toBe(false);
    expect(centuryProgress!.totalConditions).toBe(1);
    expect(centuryProgress!.conditionsMet).toBe(0); // 50 < 100

    const threeMonthProgress = result.data.progress.find(
      (p: { thresholdName: string }) => p.thresholdName === '3-month active contributor',
    );
    expect(threeMonthProgress).toBeDefined();
    expect(threeMonthProgress!.isCrossed).toBe(true);
    expect(threeMonthProgress!.conditionsMet).toBe(threeMonthProgress!.totalConditions);
  });

  it('returns empty state with available thresholds when no milestones exist', async () => {
    prisma.trackRecordMilestone.findMany.mockResolvedValue([]);
    prisma.trackRecordEvaluation.findFirst.mockResolvedValue(null);

    const result = await controller.getMyTrackRecord(mockUser as never);

    expect(result.data.milestones).toHaveLength(0);
    expect(result.data.outcomes).toHaveLength(0);
    expect(result.data.progress).toHaveLength(2); // Still shows threshold configs
    expect(
      result.data.progress.every((p: { conditionsMet: number }) => p.conditionsMet === 0),
    ).toBe(true);
    expect(result.data.latestEvaluation).toBeNull();
  });

  it('returns latest track record evaluation metrics', async () => {
    const result = await controller.getMyTrackRecord(mockUser as never);

    expect(result.data.latestEvaluation).toBeDefined();
    expect(result.data.latestEvaluation!.consistencyScore).toBe(75.5);
    expect(result.data.latestEvaluation!.engagementDurationMonths).toBe(7);
    expect(result.data.latestEvaluation!.contributionCount).toBe(50);
    expect(result.data.latestEvaluation!.domainBreadth).toBe(3);
    expect(result.data.latestEvaluation!.activeWeeksRatio).toBe(0.8);
  });
});
