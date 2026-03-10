import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TemporalAggregationProcessor } from './temporal-aggregation.processor.js';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import type { Job } from 'bullmq';
import type { AggregationJobData } from './temporal-aggregation.processor.js';

describe('TemporalAggregationProcessor', () => {
  let processor: TemporalAggregationProcessor;
  let mockAggregationService: { aggregateAllContributors: ReturnType<typeof vi.fn> };
  let mockDlqQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAggregationService = {
      aggregateAllContributors: vi.fn(),
    };

    mockDlqQueue = {
      add: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TemporalAggregationProcessor,
        {
          provide: TemporalAggregationService,
          useValue: mockAggregationService,
        },
        {
          provide: getQueueToken('reward-aggregation-dlq'),
          useValue: mockDlqQueue,
        },
      ],
    }).compile();

    processor = module.get(TemporalAggregationProcessor);
  });

  function createJob(
    data: AggregationJobData,
    opts?: { attempts?: number; attemptsMade?: number },
  ): Job<AggregationJobData> {
    return {
      id: 'job-1',
      data,
      attemptsMade: opts?.attemptsMade ?? 0,
      opts: { attempts: opts?.attempts ?? 3 },
    } as unknown as Job<AggregationJobData>;
  }

  it('should process daily aggregation job successfully', async () => {
    mockAggregationService.aggregateAllContributors.mockResolvedValue(5);

    const job = createJob({
      horizon: 'DAILY',
      correlationId: 'corr-1',
      scheduledAt: new Date().toISOString(),
    });

    await processor.process(job);

    expect(mockAggregationService.aggregateAllContributors).toHaveBeenCalledWith('DAILY', 'corr-1');
  });

  it('should retry on failure and not send to DLQ until max attempts', async () => {
    mockAggregationService.aggregateAllContributors.mockRejectedValue(new Error('DB timeout'));

    const job = createJob(
      {
        horizon: 'WEEKLY',
        correlationId: 'corr-1',
        scheduledAt: new Date().toISOString(),
      },
      { attemptsMade: 0, attempts: 3 },
    );

    await expect(processor.process(job)).rejects.toThrow('DB timeout');
    expect(mockDlqQueue.add).not.toHaveBeenCalled();
  });

  it('should send to DLQ after max attempts exhausted', async () => {
    mockAggregationService.aggregateAllContributors.mockRejectedValue(new Error('DB timeout'));

    const job = createJob(
      {
        horizon: 'MONTHLY',
        correlationId: 'corr-1',
        scheduledAt: new Date().toISOString(),
      },
      { attemptsMade: 2, attempts: 3 },
    );

    await expect(processor.process(job)).rejects.toThrow('DB timeout');
    expect(mockDlqQueue.add).toHaveBeenCalledWith(
      'dead-letter-reward-aggregation',
      expect.objectContaining({
        horizon: 'MONTHLY',
        correlationId: 'corr-1',
        failedAt: expect.any(String),
        errorMessage: 'DB timeout',
      }),
      expect.objectContaining({
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
  });

  it('should handle quarterly aggregation', async () => {
    mockAggregationService.aggregateAllContributors.mockResolvedValue(10);

    const job = createJob({
      horizon: 'QUARTERLY',
      correlationId: 'corr-q1',
      scheduledAt: new Date().toISOString(),
    });

    await processor.process(job);

    expect(mockAggregationService.aggregateAllContributors).toHaveBeenCalledWith(
      'QUARTERLY',
      'corr-q1',
    );
  });
});
