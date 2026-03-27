import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackRecordComputeService } from './track-record-compute.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

const mockPrisma = {
  contribution: {
    findFirst: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  workingGroupMember: {
    findMany: vi.fn(),
  },
  activityEvent: {
    findMany: vi.fn(),
  },
  trackRecordEvaluation: {
    create: vi.fn(),
  },
  // These should NEVER be called — stream independence (NP-NFR2)
  evaluation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  contributionScore: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  scoringFormulaVersion: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
};

describe('TrackRecordComputeService', () => {
  let service: TrackRecordComputeService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [TrackRecordComputeService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TrackRecordComputeService>(TrackRecordComputeService);
  });

  describe('computeTrackRecord', () => {
    const contributorId = 'contributor-uuid-1';
    const now = new Date('2026-03-26T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should compute contribution_count from contributions table only', async () => {
      mockPrisma.contribution.findFirst.mockResolvedValue({
        createdAt: new Date('2025-09-01T00:00:00Z'),
      });
      mockPrisma.contribution.count.mockResolvedValue(42);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-1' });

      await service.computeTrackRecord(contributorId);

      expect(mockPrisma.contribution.count).toHaveBeenCalledWith({
        where: { contributorId },
      });
      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      expect(createCall.data.contributionCount).toBe(42);
    });

    it('should compute domain_breadth from working group memberships', async () => {
      mockPrisma.contribution.findFirst.mockResolvedValue({
        createdAt: new Date('2025-06-01T00:00:00Z'),
      });
      mockPrisma.contribution.count.mockResolvedValue(10);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { domain: 'Technology' } },
        { workingGroup: { domain: 'Finance' } },
        { workingGroup: { domain: 'Technology' } }, // duplicate
      ]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-2' });

      await service.computeTrackRecord(contributorId);

      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      expect(createCall.data.domainBreadth).toBe(2); // Technology + Finance
    });

    it('should compute engagement_duration_months correctly', async () => {
      mockPrisma.contribution.findFirst.mockResolvedValue({
        createdAt: new Date('2025-09-26T00:00:00Z'), // 6 months ago
      });
      mockPrisma.contribution.count.mockResolvedValue(5);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-3' });

      await service.computeTrackRecord(contributorId);

      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      expect(createCall.data.engagementDurationMonths).toBe(6);
    });

    it('should compute active_weeks_ratio from activity_events only', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      mockPrisma.contribution.findFirst.mockResolvedValue({ createdAt: startDate });
      mockPrisma.contribution.count.mockResolvedValue(8);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      // Activity events in 4 distinct weeks
      mockPrisma.activityEvent.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-06T10:00:00Z') }, // Week 2
        { createdAt: new Date('2026-01-07T10:00:00Z') }, // Week 2 (same week)
        { createdAt: new Date('2026-01-13T10:00:00Z') }, // Week 3
        { createdAt: new Date('2026-02-03T10:00:00Z') }, // Week 6
        { createdAt: new Date('2026-03-02T10:00:00Z') }, // Week 10
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-4' });

      await service.computeTrackRecord(contributorId);

      expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith({
        where: { contributorId },
        select: { createdAt: true },
      });
      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      // activeWeeksRatio should be a Decimal
      expect(Number(createCall.data.activeWeeksRatio)).toBeGreaterThan(0);
      expect(Number(createCall.data.activeWeeksRatio)).toBeLessThanOrEqual(1);
    });

    it('should compute consistency_score based on contribution regularity', async () => {
      const startDate = new Date('2025-09-01T00:00:00Z');
      mockPrisma.contribution.findFirst.mockResolvedValue({ createdAt: startDate });
      mockPrisma.contribution.count.mockResolvedValue(4);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([
        { createdAt: new Date('2025-10-01T00:00:00Z') },
        { createdAt: new Date('2025-11-01T00:00:00Z') },
        { createdAt: new Date('2025-12-01T00:00:00Z') },
        { createdAt: new Date('2026-01-01T00:00:00Z') },
      ]);
      // Evenly spaced contributions (high regularity)
      mockPrisma.contribution.findMany.mockResolvedValue([
        { createdAt: new Date('2025-10-01T00:00:00Z') },
        { createdAt: new Date('2025-11-01T00:00:00Z') },
        { createdAt: new Date('2025-12-01T00:00:00Z') },
        { createdAt: new Date('2026-01-01T00:00:00Z') },
      ]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-5' });

      await service.computeTrackRecord(contributorId);

      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      const score = Number(createCall.data.consistencyScore);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should create TrackRecordEvaluation record with correct fields', async () => {
      const startDate = new Date('2025-06-01T00:00:00Z');
      mockPrisma.contribution.findFirst.mockResolvedValue({ createdAt: startDate });
      mockPrisma.contribution.count.mockResolvedValue(20);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { domain: 'Technology' } },
        { workingGroup: { domain: 'Impact' } },
      ]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([
        { createdAt: new Date('2025-07-01T00:00:00Z') },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { createdAt: new Date('2025-07-01T00:00:00Z') },
      ]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-6' });

      await service.computeTrackRecord(contributorId);

      expect(mockPrisma.trackRecordEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributorId,
          evaluationPeriodStart: startDate,
          evaluationPeriodEnd: now,
          contributionCount: 20,
          domainBreadth: 2,
          engagementDurationMonths: 9,
        }),
      });
    });

    it('should handle contributor with zero contributions gracefully', async () => {
      mockPrisma.contribution.findFirst.mockResolvedValue(null);
      mockPrisma.contribution.count.mockResolvedValue(0);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-7' });

      await service.computeTrackRecord(contributorId);

      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      expect(createCall.data.contributionCount).toBe(0);
      expect(createCall.data.domainBreadth).toBe(0);
      expect(createCall.data.engagementDurationMonths).toBe(0);
      expect(Number(createCall.data.activeWeeksRatio)).toBe(0);
    });

    it('should handle contributor with single contribution', async () => {
      const singleDate = new Date('2026-03-20T00:00:00Z');
      mockPrisma.contribution.findFirst.mockResolvedValue({ createdAt: singleDate });
      mockPrisma.contribution.count.mockResolvedValue(1);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { workingGroup: { domain: 'Governance' } },
      ]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([{ createdAt: singleDate }]);
      mockPrisma.contribution.findMany.mockResolvedValue([{ createdAt: singleDate }]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-8' });

      await service.computeTrackRecord(contributorId);

      const createCall = mockPrisma.trackRecordEvaluation.create.mock.calls[0][0];
      expect(createCall.data.contributionCount).toBe(1);
      expect(createCall.data.domainBreadth).toBe(1);
      // With single contribution, consistency is based on activity ratio only
      expect(Number(createCall.data.consistencyScore)).toBeGreaterThanOrEqual(0);
    });

    it('should NEVER query evaluation, contributionScore, or scoringFormulaVersion tables (NP-NFR2)', async () => {
      mockPrisma.contribution.findFirst.mockResolvedValue(null);
      mockPrisma.contribution.count.mockResolvedValue(0);
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.contribution.findMany.mockResolvedValue([]);
      mockPrisma.trackRecordEvaluation.create.mockResolvedValue({ id: 'eval-9' });

      await service.computeTrackRecord(contributorId);

      // Verify stream independence — these tables must NEVER be queried
      expect(mockPrisma.evaluation.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.evaluation.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.evaluation.count).not.toHaveBeenCalled();
      expect(mockPrisma.contributionScore.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.contributionScore.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.scoringFormulaVersion.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.scoringFormulaVersion.findFirst).not.toHaveBeenCalled();
    });
  });
});
