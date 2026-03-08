import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type { Job } from 'bullmq';
import type { NotificationJobData } from './notification.service.js';

const mockPrisma = {
  notification: {
    create: vi.fn(),
  },
};

const mockRedisService = {
  publish: vi.fn(),
};

const mockDlqQueue = {
  add: vi.fn(),
};

function createMockJob(
  data: NotificationJobData,
  overrides: Partial<Job<NotificationJobData>> = {},
): Job<NotificationJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<NotificationJobData>;
}

const baseJobData: NotificationJobData = {
  contributorId: 'user-1',
  type: 'ANNOUNCEMENT_POSTED',
  title: 'New announcement in Technology',
  description: 'Welcome to the team!',
  entityId: 'ann-1',
  category: 'working-groups',
  correlationId: 'corr-1',
};

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: getQueueToken('notification-dlq'), useValue: mockDlqQueue },
      ],
    }).compile();

    processor = module.get(NotificationProcessor);
  });

  describe('process', () => {
    it('persists notification to database', async () => {
      const createdAt = new Date('2026-03-08T10:00:00Z');
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        contributorId: 'user-1',
        type: 'ANNOUNCEMENT_POSTED',
        title: 'New announcement in Technology',
        description: 'Welcome to the team!',
        entityId: 'ann-1',
        category: 'working-groups',
        read: false,
        createdAt,
        readAt: null,
      });
      mockRedisService.publish.mockResolvedValue(undefined);

      const job = createMockJob(baseJobData);
      await processor.process(job);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          contributorId: 'user-1',
          type: 'ANNOUNCEMENT_POSTED',
          title: 'New announcement in Technology',
          description: 'Welcome to the team!',
          entityId: 'ann-1',
          category: 'working-groups',
        },
      });
    });

    it('publishes to Redis channel for SSE delivery', async () => {
      const createdAt = new Date('2026-03-08T10:00:00Z');
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        contributorId: 'user-1',
        type: 'ANNOUNCEMENT_POSTED',
        title: 'New announcement in Technology',
        description: 'Welcome to the team!',
        entityId: 'ann-1',
        category: 'working-groups',
        read: false,
        createdAt,
        readAt: null,
      });
      mockRedisService.publish.mockResolvedValue(undefined);

      const job = createMockJob(baseJobData);
      await processor.process(job);

      expect(mockRedisService.publish).toHaveBeenCalledWith(
        'notifications-user-1',
        expect.stringContaining('"type":"notification.new"'),
      );

      const publishedPayload = JSON.parse(mockRedisService.publish.mock.calls[0][1] as string);
      expect(publishedPayload).toEqual({
        type: 'notification.new',
        notification: {
          id: 'notif-1',
          contributorId: 'user-1',
          type: 'ANNOUNCEMENT_POSTED',
          title: 'New announcement in Technology',
          description: 'Welcome to the team!',
          entityId: 'ann-1',
          category: 'working-groups',
          read: false,
          createdAt: '2026-03-08T10:00:00.000Z',
          readAt: null,
        },
      });
    });

    it('handles null description', async () => {
      const jobData = { ...baseJobData, description: undefined };
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        contributorId: 'user-1',
        type: 'ANNOUNCEMENT_POSTED',
        title: 'New announcement',
        description: null,
        entityId: 'ann-1',
        category: 'working-groups',
        read: false,
        createdAt: new Date(),
        readAt: null,
      });
      mockRedisService.publish.mockResolvedValue(undefined);

      const job = createMockJob(jobData);
      await processor.process(job);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: null }),
      });
    });

    it('moves to DLQ after max retries', async () => {
      const dbError = new Error('Database connection lost');
      mockPrisma.notification.create.mockRejectedValue(dbError);
      mockDlqQueue.add.mockResolvedValue({ id: 'dlq-job-1' });

      // attemptsMade = 2 means this is the 3rd attempt (0-indexed), maxAttempts = 3
      const job = createMockJob(baseJobData, {
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as Partial<Job<NotificationJobData>>);

      await expect(processor.process(job)).rejects.toThrow('Database connection lost');

      expect(mockDlqQueue.add).toHaveBeenCalledWith(
        'dead-letter-notification',
        expect.objectContaining({
          ...baseJobData,
          failedAt: expect.any(String),
          errorMessage: 'Database connection lost',
        }),
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    });

    it('does not move to DLQ when retries remain', async () => {
      const dbError = new Error('Temporary failure');
      mockPrisma.notification.create.mockRejectedValue(dbError);

      // attemptsMade = 0 means first attempt, retries remain
      const job = createMockJob(baseJobData, {
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as Partial<Job<NotificationJobData>>);

      await expect(processor.process(job)).rejects.toThrow('Temporary failure');

      expect(mockDlqQueue.add).not.toHaveBeenCalled();
    });

    it('re-throws error after DLQ move for BullMQ failure tracking', async () => {
      const dbError = new Error('Final failure');
      mockPrisma.notification.create.mockRejectedValue(dbError);
      mockDlqQueue.add.mockResolvedValue({ id: 'dlq-job-1' });

      const job = createMockJob(baseJobData, {
        attemptsMade: 2,
        opts: { attempts: 3 },
      } as Partial<Job<NotificationJobData>>);

      await expect(processor.process(job)).rejects.toThrow('Final failure');
    });
  });
});
