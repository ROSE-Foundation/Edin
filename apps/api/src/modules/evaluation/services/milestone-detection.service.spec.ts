import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { MilestoneDetectionService } from './milestone-detection.service.js';
import { TrackRecordOutcomeService } from './track-record-outcome.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ActivityService } from '../../activity/activity.service.js';
import { NotificationService } from '../../notification/notification.service.js';

describe('MilestoneDetectionService', () => {
  let service: MilestoneDetectionService;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let activityService: { createActivityEvent: ReturnType<typeof vi.fn> };
  let notificationService: { enqueueNotification: ReturnType<typeof vi.fn> };
  let outcomeService: { grantOutcomesForMilestone: ReturnType<typeof vi.fn> };

  const mockContributorId = '11111111-1111-1111-1111-111111111111';
  const mockMilestoneId = '22222222-2222-2222-2222-222222222222';

  const mockEvaluation = {
    id: '33333333-3333-3333-3333-333333333333',
    consistencyScore: 75.5,
    engagementDurationMonths: 7,
    contributionCount: 50,
    domainBreadth: 3,
    activeWeeksRatio: 0.8,
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
      createdAt: new Date(),
    },
    {
      id: 'config-2',
      milestoneType: 'DURATION',
      thresholdName: '6-month consistent contributor',
      thresholdRules: {
        conditions: [
          { field: 'engagement_duration_months', operator: '>=', value: 6 },
          { field: 'active_weeks_ratio', operator: '>=', value: 0.7 },
        ],
      },
      outcomeType: 'ROLE_ELIGIBILITY',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'config-3',
      milestoneType: 'VOLUME',
      thresholdName: 'Century contributor',
      thresholdRules: {
        conditions: [{ field: 'contribution_count', operator: '>=', value: 100 }],
      },
      outcomeType: 'INVITATION',
      isActive: true,
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    prisma = {
      trackRecordThresholdConfig: {
        findMany: vi.fn().mockResolvedValue(mockThresholdConfigs),
      },
      trackRecordMilestone: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((args) =>
          Promise.resolve({
            id: mockMilestoneId,
            contributorId: args.data.contributorId,
            milestoneType: args.data.milestoneType,
            thresholdName: args.data.thresholdName,
            thresholdConfigSnapshot: args.data.thresholdConfigSnapshot,
            crossedAt: new Date(),
            metadata: null,
          }),
        ),
      },
      contributor: {
        findUnique: vi.fn().mockResolvedValue({ domain: 'Technology' }),
      },
    };

    activityService = {
      createActivityEvent: vi.fn().mockResolvedValue({}),
    };

    notificationService = {
      enqueueNotification: vi.fn().mockResolvedValue(undefined),
    };

    outcomeService = {
      grantOutcomesForMilestone: vi.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestoneDetectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: NotificationService, useValue: notificationService },
        { provide: TrackRecordOutcomeService, useValue: outcomeService },
      ],
    }).compile();

    service = moduleRef.get(MilestoneDetectionService);
  });

  it('detects a single milestone crossing when all conditions are met', async () => {
    // Only include one threshold that will be crossed
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(1);
    expect(result[0].milestoneType).toBe('DURATION');
    expect(result[0].thresholdName).toBe('3-month active contributor');
    expect(prisma.trackRecordMilestone.create).toHaveBeenCalledOnce();
  });

  it('skips milestone when contributor already has it (idempotency)', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);
    prisma.trackRecordMilestone.findMany.mockResolvedValue([
      { milestoneType: 'DURATION', thresholdName: '3-month active contributor' },
    ]);

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(0);
    expect(prisma.trackRecordMilestone.create).not.toHaveBeenCalled();
  });

  it('handles unique constraint violation gracefully (P2002 — concurrent crossing)', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);
    prisma.trackRecordMilestone.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(0);
    // Should not throw
  });

  it('evaluates multi-condition thresholds — all must pass', async () => {
    // 6-month requires engagement >= 6 AND activeWeeksRatio >= 0.7
    // mockEvaluation has 7 months and 0.8 ratio — both pass
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[1]]);

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(1);
    expect(result[0].thresholdName).toBe('6-month consistent contributor');
  });

  it('rejects multi-condition threshold when one condition fails', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[1]]);

    // Only 4 months — fails the >= 6 condition
    const shortEvaluation = { ...mockEvaluation, engagementDurationMonths: 4 };
    const result = await service.detectMilestones(mockContributorId, shortEvaluation);

    expect(result).toHaveLength(0);
    expect(prisma.trackRecordMilestone.create).not.toHaveBeenCalled();
  });

  it('skips inactive threshold configs (isActive: false)', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([]);

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(0);
  });

  it('emits TRACK_RECORD_MILESTONE_CROSSED activity event on crossing', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);

    await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(activityService.createActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TRACK_RECORD_MILESTONE_CROSSED',
        title: 'Milestone achieved: 3-month active contributor',
        contributorId: mockContributorId,
        entityId: mockMilestoneId,
      }),
    );
  });

  it('queues TRACK_RECORD_MILESTONE notification on crossing', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);

    await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(notificationService.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        contributorId: mockContributorId,
        type: 'TRACK_RECORD_MILESTONE',
        title: 'You reached a milestone: 3-month active contributor',
        category: 'track-record',
        entityId: mockMilestoneId,
      }),
    );
  });

  it('returns empty array when no thresholds are crossed', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[2]]);

    // Century contributor requires 100 contributions, we only have 50
    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(0);
    expect(prisma.trackRecordMilestone.create).not.toHaveBeenCalled();
  });

  it('freezes threshold_config_snapshot at crossing time', async () => {
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue([mockThresholdConfigs[0]]);

    await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(prisma.trackRecordMilestone.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        thresholdConfigSnapshot: expect.objectContaining({
          id: 'config-1',
          milestoneType: 'DURATION',
          thresholdName: '3-month active contributor',
          thresholdRules: mockThresholdConfigs[0].thresholdRules,
          outcomeType: 'ROLE_ELIGIBILITY',
          frozenAt: expect.any(String),
        }),
      }),
    });
  });

  it('processes multiple thresholds, crossing some and skipping others', async () => {
    // All 3 configs: 3-month (passes), 6-month (passes), Century (fails — needs 100, has 50)
    prisma.trackRecordThresholdConfig.findMany.mockResolvedValue(mockThresholdConfigs);

    const result = await service.detectMilestones(mockContributorId, mockEvaluation);

    expect(result).toHaveLength(2); // 3-month and 6-month pass, Century fails
    expect(prisma.trackRecordMilestone.create).toHaveBeenCalledTimes(2);
    expect(activityService.createActivityEvent).toHaveBeenCalledTimes(2);
    expect(notificationService.enqueueNotification).toHaveBeenCalledTimes(2);
  });
});
