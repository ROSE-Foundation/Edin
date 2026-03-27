import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackRecordOutcomeService } from './track-record-outcome.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ActivityService } from '../../activity/activity.service.js';
import { NotificationService } from '../../notification/notification.service.js';

describe('TrackRecordOutcomeService', () => {
  let service: TrackRecordOutcomeService;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let activityService: { createActivityEvent: ReturnType<typeof vi.fn> };
  let notificationService: { enqueueNotification: ReturnType<typeof vi.fn> };

  const mockContributorId = '11111111-1111-1111-1111-111111111111';
  const mockMilestoneId = '22222222-2222-2222-2222-222222222222';
  const mockOutcomeId = '44444444-4444-4444-4444-444444444444';

  const mockMilestone = {
    id: mockMilestoneId,
    milestoneType: 'DURATION',
    thresholdName: '6-month consistent contributor',
    thresholdConfigSnapshot: {
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
      frozenAt: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    prisma = {
      trackRecordOutcome: {
        create: vi.fn().mockImplementation((args) =>
          Promise.resolve({
            id: mockOutcomeId,
            milestoneId: args.data.milestoneId,
            contributorId: args.data.contributorId,
            outcomeType: args.data.outcomeType,
            outcomeDetails: args.data.outcomeDetails,
            grantedAt: new Date(),
            expiresAt: null,
            status: 'ACTIVE',
            metadata: args.data.metadata,
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrackRecordOutcomeService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(TrackRecordOutcomeService);
  });

  it('grants outcome from milestone with ROLE_ELIGIBILITY outcomeType', async () => {
    const result = await service.grantOutcomesForMilestone(mockContributorId, mockMilestone);

    expect(result).toHaveLength(1);
    expect(result[0].outcomeType).toBe('ROLE_ELIGIBILITY');
    expect(result[0].status).toBe('ACTIVE');
    expect(prisma.trackRecordOutcome.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        milestoneId: mockMilestoneId,
        contributorId: mockContributorId,
        outcomeType: 'ROLE_ELIGIBILITY',
        outcomeDetails: expect.objectContaining({
          description: expect.stringContaining('6-month consistent contributor'),
        }),
      }),
    });
  });

  it('grants outcome from milestone with SALARY_TIER outcomeType', async () => {
    const salaryMilestone = {
      ...mockMilestone,
      thresholdName: '12-month sustained contributor',
      thresholdConfigSnapshot: {
        ...mockMilestone.thresholdConfigSnapshot,
        outcomeType: 'SALARY_TIER',
        thresholdName: '12-month sustained contributor',
      },
    };

    const result = await service.grantOutcomesForMilestone(mockContributorId, salaryMilestone);

    expect(result).toHaveLength(1);
    expect(result[0].outcomeType).toBe('SALARY_TIER');
    expect(prisma.trackRecordOutcome.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outcomeType: 'SALARY_TIER',
        outcomeDetails: expect.objectContaining({
          description: expect.stringContaining('salary tier advancement'),
        }),
      }),
    });
  });

  it('handles duplicate outcome creation (P2002) gracefully', async () => {
    prisma.trackRecordOutcome.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.grantOutcomesForMilestone(mockContributorId, mockMilestone);

    expect(result).toHaveLength(0);
    // Should not throw
  });

  it('emits TRACK_RECORD_OUTCOME_GRANTED activity event', async () => {
    await service.grantOutcomesForMilestone(mockContributorId, mockMilestone);

    expect(activityService.createActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'TRACK_RECORD_OUTCOME_GRANTED',
        title: 'Outcome unlocked: ROLE_ELIGIBILITY',
        contributorId: mockContributorId,
        entityId: mockOutcomeId,
        metadata: expect.objectContaining({
          outcomeType: 'ROLE_ELIGIBILITY',
          milestoneId: mockMilestoneId,
        }),
      }),
    );
  });

  it('queues TRACK_RECORD_OUTCOME notification', async () => {
    await service.grantOutcomesForMilestone(mockContributorId, mockMilestone);

    expect(notificationService.enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        contributorId: mockContributorId,
        type: 'TRACK_RECORD_OUTCOME',
        title: expect.stringContaining('ROLE_ELIGIBILITY'),
        category: 'track-record',
        entityId: mockOutcomeId,
      }),
    );
  });

  it('returns empty array when outcomeType is missing from config snapshot', async () => {
    const noOutcomeMilestone = {
      ...mockMilestone,
      thresholdConfigSnapshot: {
        ...mockMilestone.thresholdConfigSnapshot,
        outcomeType: undefined,
      },
    };

    const result = await service.grantOutcomesForMilestone(mockContributorId, noOutcomeMilestone);

    expect(result).toHaveLength(0);
    expect(prisma.trackRecordOutcome.create).not.toHaveBeenCalled();
  });

  it('returns empty array when outcomeType is not a valid type', async () => {
    const invalidOutcomeMilestone = {
      ...mockMilestone,
      thresholdConfigSnapshot: {
        ...mockMilestone.thresholdConfigSnapshot,
        outcomeType: 'UNKNOWN_TYPE',
      },
    };

    const result = await service.grantOutcomesForMilestone(
      mockContributorId,
      invalidOutcomeMilestone,
    );

    expect(result).toHaveLength(0);
    expect(prisma.trackRecordOutcome.create).not.toHaveBeenCalled();
  });

  it('does NOT import from evaluation.service or combined-evaluation.service', async () => {
    // Static analysis: read the source and verify no forbidden imports
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('./track-record-outcome.service.ts', import.meta.url),
      'utf-8',
    );

    expect(source).not.toContain("from './evaluation.service");
    expect(source).not.toContain("from '../evaluation.service");
    expect(source).not.toContain("from './combined-evaluation.service");
    expect(source).not.toContain("from '../services/combined-evaluation.service");
  });
});
