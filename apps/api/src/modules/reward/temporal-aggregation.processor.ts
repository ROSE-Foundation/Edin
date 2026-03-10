import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import type { TemporalHorizon } from '@edin/shared';

export interface AggregationJobData {
  horizon: TemporalHorizon;
  correlationId: string;
  scheduledAt: string;
}

@Processor('reward-aggregation')
export class TemporalAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(TemporalAggregationProcessor.name);

  constructor(
    private readonly aggregationService: TemporalAggregationService,
    @InjectQueue('reward-aggregation-dlq')
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<AggregationJobData>): Promise<void> {
    const { horizon, correlationId } = job.data;

    this.logger.log('Processing temporal aggregation job', {
      module: 'reward',
      jobId: job.id,
      horizon,
      correlationId,
    });

    try {
      const count = await this.aggregationService.aggregateAllContributors(horizon, correlationId);

      this.logger.log('Temporal aggregation job completed', {
        module: 'reward',
        jobId: job.id,
        horizon,
        contributorsProcessed: count,
        correlationId,
      });
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.dlqQueue.add(
          'dead-letter-reward-aggregation',
          {
            ...job.data,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.warn('Temporal aggregation failed after all retries', {
          module: 'reward',
          jobId: job.id,
          horizon,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Temporal aggregation attempt failed, will retry', {
          module: 'reward',
          jobId: job.id,
          horizon,
          attempt: attemptsMade,
          maxAttempts,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }
}
