import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AggregationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AggregationSchedulerService.name);

  constructor(
    @InjectQueue('reward-aggregation')
    private readonly aggregationQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerScheduledJobs();
  }

  private async registerScheduledJobs(): Promise<void> {
    // Daily aggregation — every day at 00:00 UTC
    await this.aggregationQueue.add(
      'aggregate-daily',
      {
        horizon: 'DAILY',
        correlationId: `scheduled-daily-${randomUUID()}`,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { pattern: '0 0 * * *' },
        jobId: 'scheduled-daily-aggregation',
      },
    );

    // Weekly aggregation — every Monday at 00:00 UTC
    await this.aggregationQueue.add(
      'aggregate-weekly',
      {
        horizon: 'WEEKLY',
        correlationId: `scheduled-weekly-${randomUUID()}`,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { pattern: '0 0 * * 1' },
        jobId: 'scheduled-weekly-aggregation',
      },
    );

    // Monthly aggregation — 1st of every month at 00:00 UTC
    await this.aggregationQueue.add(
      'aggregate-monthly',
      {
        horizon: 'MONTHLY',
        correlationId: `scheduled-monthly-${randomUUID()}`,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { pattern: '0 0 1 * *' },
        jobId: 'scheduled-monthly-aggregation',
      },
    );

    // Quarterly aggregation — 1st of Jan, Apr, Jul, Oct at 00:00 UTC
    await this.aggregationQueue.add(
      'aggregate-quarterly',
      {
        horizon: 'QUARTERLY',
        correlationId: `scheduled-quarterly-${randomUUID()}`,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { pattern: '0 0 1 1,4,7,10 *' },
        jobId: 'scheduled-quarterly-aggregation',
      },
    );

    // Yearly aggregation — January 1st at 00:00 UTC
    await this.aggregationQueue.add(
      'aggregate-yearly',
      {
        horizon: 'YEARLY',
        correlationId: `scheduled-yearly-${randomUUID()}`,
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { pattern: '0 0 1 1 *' },
        jobId: 'scheduled-yearly-aggregation',
      },
    );

    this.logger.log('Scheduled aggregation jobs registered', {
      module: 'reward',
      jobs: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    });
  }
}
