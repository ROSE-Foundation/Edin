import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { IntrinsicTimeService } from './intrinsic-time.service.js';
import { randomUUID } from 'crypto';

export interface IntrinsicTimeJobData {
  correlationId: string;
  scheduledAt: string;
}

@Processor('newspaper-edition')
export class IntrinsicTimeProcessor extends WorkerHost {
  private readonly logger = new Logger(IntrinsicTimeProcessor.name);

  constructor(
    private readonly intrinsicTimeService: IntrinsicTimeService,
    @InjectQueue('newspaper-edition-dlq')
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<IntrinsicTimeJobData>): Promise<void> {
    const correlationId = job.data?.correlationId ?? randomUUID();

    this.logger.log('Processing intrinsic time check', {
      module: 'newspaper',
      jobId: job.id,
      correlationId,
    });

    try {
      await this.intrinsicTimeService.evaluateAndCreateEdition(correlationId);

      this.logger.log('Intrinsic time check completed', {
        module: 'newspaper',
        jobId: job.id,
        correlationId,
      });
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.dlqQueue.add(
          'dead-letter-newspaper-edition',
          {
            correlationId,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.warn('Intrinsic time check failed after all retries', {
          module: 'newspaper',
          jobId: job.id,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Intrinsic time check attempt failed, will retry', {
          module: 'newspaper',
          jobId: job.id,
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
