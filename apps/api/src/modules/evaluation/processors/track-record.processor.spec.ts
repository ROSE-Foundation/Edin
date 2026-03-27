import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackRecordProcessor } from './track-record.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { TrackRecordComputeService } from '../services/track-record-compute.service.js';
import { MilestoneDetectionService } from '../services/milestone-detection.service.js';
import type { Job } from 'bullmq';

describe('TrackRecordProcessor', () => {
  let processor: TrackRecordProcessor;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let computeService: { computeTrackRecord: ReturnType<typeof vi.fn> };
  let milestoneService: { detectMilestones: ReturnType<typeof vi.fn> };

  const mockContributors = [
    { id: 'contributor-1' },
    { id: 'contributor-2' },
    { id: 'contributor-3' },
  ];

  const mockEvaluation = {
    id: 'eval-1',
    consistencyScore: 75,
    engagementDurationMonths: 6,
    contributionCount: 50,
    domainBreadth: 2,
    activeWeeksRatio: 0.8,
  };

  const mockJob = {
    id: 'job-1',
    data: {},
    updateProgress: vi.fn(),
  } as unknown as Job;

  beforeEach(async () => {
    prisma = {
      contributor: {
        findMany: vi.fn().mockResolvedValueOnce(mockContributors).mockResolvedValueOnce([]), // Second call returns empty to end the loop
      },
    };

    computeService = {
      computeTrackRecord: vi.fn().mockResolvedValue(mockEvaluation),
    };

    milestoneService = {
      detectMilestones: vi.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrackRecordProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: TrackRecordComputeService, useValue: computeService },
        { provide: MilestoneDetectionService, useValue: milestoneService },
      ],
    }).compile();

    processor = moduleRef.get(TrackRecordProcessor);
  });

  it('processes all active contributors in batches', async () => {
    await processor.process(mockJob);

    expect(prisma.contributor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        select: { id: true },
        take: 50,
        orderBy: { id: 'asc' },
      }),
    );
  });

  it('calls computeTrackRecord and detectMilestones for each contributor', async () => {
    await processor.process(mockJob);

    expect(computeService.computeTrackRecord).toHaveBeenCalledTimes(3);
    expect(milestoneService.detectMilestones).toHaveBeenCalledTimes(3);

    for (const contributor of mockContributors) {
      expect(computeService.computeTrackRecord).toHaveBeenCalledWith(contributor.id);
      expect(milestoneService.detectMilestones).toHaveBeenCalledWith(
        contributor.id,
        mockEvaluation,
      );
    }
  });

  it('handles individual contributor failure gracefully (continues processing)', async () => {
    // Second contributor fails
    computeService.computeTrackRecord
      .mockResolvedValueOnce(mockEvaluation) // contributor-1 OK
      .mockRejectedValueOnce(new Error('DB connection lost')) // contributor-2 FAIL
      .mockResolvedValueOnce(mockEvaluation); // contributor-3 OK

    await processor.process(mockJob);

    // contributor-1 and contributor-3 should still be processed
    expect(computeService.computeTrackRecord).toHaveBeenCalledTimes(3);
    // milestone detection called for contributor-1 and contributor-3 only
    expect(milestoneService.detectMilestones).toHaveBeenCalledTimes(2);
  });

  it('updates job progress after each batch', async () => {
    await processor.process(mockJob);

    expect(mockJob.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        totalProcessed: 3,
        totalMilestones: 0,
        totalErrors: 0,
      }),
    );
  });
});
