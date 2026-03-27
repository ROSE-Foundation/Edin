import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { IntrinsicTimeService } from './intrinsic-time.service.js';
import { NewspaperItemService } from './newspaper-item.service.js';
import { IntrinsicTimeProcessor } from './intrinsic-time.processor.js';
import { ChathamHouseAttributionService } from './chatham-house-attribution.service.js';
import { NewspaperItemVotingService } from './newspaper-item-voting.service.js';
import { NewspaperController } from './newspaper.controller.js';

@Module({
  imports: [
    PrismaModule,
    ActivityModule,
    BullModule.registerQueue({
      name: 'newspaper-edition',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'newspaper-edition-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [NewspaperController],
  providers: [
    IntrinsicTimeService,
    NewspaperItemService,
    IntrinsicTimeProcessor,
    ChathamHouseAttributionService,
    NewspaperItemVotingService,
  ],
  exports: [
    IntrinsicTimeService,
    NewspaperItemService,
    ChathamHouseAttributionService,
    NewspaperItemVotingService,
  ],
})
export class NewspaperModule implements OnModuleInit {
  private readonly logger = new Logger(NewspaperModule.name);

  constructor(
    @InjectQueue('newspaper-edition')
    private readonly editionQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const checkIntervalMs = Number(this.configService.get('NEWSPAPER_CHECK_INTERVAL_MS', '900000'));

    // Remove any existing repeatable jobs to avoid duplicates on restart
    const existingRepeatables = await this.editionQueue.getRepeatableJobs();
    for (const job of existingRepeatables) {
      await this.editionQueue.removeRepeatableByKey(job.key);
    }

    await this.editionQueue.add(
      'check-edition',
      {
        correlationId: 'scheduled',
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: { every: checkIntervalMs },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Newspaper edition check scheduled every ${checkIntervalMs / 1000}s`, {
      module: 'newspaper',
      intervalMs: checkIntervalMs,
    });
  }
}
