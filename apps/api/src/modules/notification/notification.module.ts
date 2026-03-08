import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationProcessor } from './notification.processor.js';
import { NotificationSseService } from './notification-sse.service.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'notification',
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
      name: 'notification-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationProcessor, NotificationSseService],
  exports: [NotificationService],
})
export class NotificationModule {}
