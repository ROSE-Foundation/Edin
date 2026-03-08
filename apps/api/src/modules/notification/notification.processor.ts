import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type { NotificationJobData } from './notification.service.js';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue('notification-dlq')
    private readonly notificationDlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { contributorId, type, title, description, entityId, category, correlationId } = job.data;

    this.logger.log('Processing notification job', {
      module: 'notification',
      jobId: job.id,
      type,
      contributorId,
      correlationId,
    });

    try {
      const notification = await this.prisma.notification.create({
        data: {
          contributorId,
          type: type as never,
          title,
          description: description ?? null,
          entityId,
          category,
        },
      });

      const ssePayload = {
        type: 'notification.new' as const,
        notification: {
          id: notification.id,
          contributorId: notification.contributorId,
          type: notification.type,
          title: notification.title,
          description: notification.description,
          entityId: notification.entityId,
          category: notification.category,
          read: notification.read,
          createdAt: notification.createdAt.toISOString(),
          readAt: null,
        },
      };

      await this.redisService.publish(`notifications-${contributorId}`, JSON.stringify(ssePayload));

      this.logger.log('Notification processed and delivered', {
        module: 'notification',
        jobId: job.id,
        notificationId: notification.id,
        correlationId,
      });
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.notificationDlqQueue.add(
          'dead-letter-notification',
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

        this.logger.warn('Notification processing failed after all retries', {
          module: 'notification',
          jobId: job.id,
          type,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Notification processing attempt failed, will retry', {
          module: 'notification',
          jobId: job.id,
          type,
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
