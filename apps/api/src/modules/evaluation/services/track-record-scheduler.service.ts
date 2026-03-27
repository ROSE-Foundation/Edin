import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

const WEEKLY_CRON = '0 2 * * 0'; // Every Sunday at 2:00 AM
const JOB_NAME = 'compute-all-track-records';

@Injectable()
export class TrackRecordSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TrackRecordSchedulerService.name);

  constructor(@InjectQueue('track-record') private readonly trackRecordQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.setupRepeatableJob();
  }

  /**
   * Registers a repeatable BullMQ job with weekly cadence.
   * Uses BullMQ's built-in repeat support — no @nestjs/schedule needed.
   * Throws on failure to fail-fast during bootstrap (consistent with AggregationSchedulerService).
   */
  private async setupRepeatableJob(): Promise<void> {
    // Remove any existing repeatable jobs to avoid duplicates on restart
    const existingRepeatableJobs = await this.trackRecordQueue.getRepeatableJobs();
    for (const existing of existingRepeatableJobs) {
      if (existing.name === JOB_NAME) {
        await this.trackRecordQueue.removeRepeatableByKey(existing.key);
      }
    }

    // Add the repeatable job with stable jobId for deduplication
    await this.trackRecordQueue.add(
      JOB_NAME,
      {},
      {
        jobId: JOB_NAME,
        repeat: { pattern: WEEKLY_CRON },
      },
    );

    this.logger.log('Track record weekly job registered', {
      module: 'evaluation',
      cron: WEEKLY_CRON,
      jobName: JOB_NAME,
    });
  }
}
