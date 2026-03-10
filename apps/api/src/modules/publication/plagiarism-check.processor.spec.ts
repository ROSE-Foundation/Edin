import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { PlagiarismCheckProcessor } from './plagiarism-check.processor.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Job } from 'bullmq';
import type { PlagiarismCheckJobData } from './moderation.service.js';

describe('PlagiarismCheckProcessor', () => {
  let processor: PlagiarismCheckProcessor;
  let prisma: { [key: string]: { [key: string]: ReturnType<typeof vi.fn> } };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let dlqQueue: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      platformSetting: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      article: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      moderationReport: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };

    eventEmitter = { emit: vi.fn() };
    dlqQueue = { add: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PlagiarismCheckProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: getQueueToken('plagiarism-check-dlq'), useValue: dlqQueue },
      ],
    }).compile();

    processor = module.get(PlagiarismCheckProcessor);
  });

  function createJob(data: Partial<PlagiarismCheckJobData> = {}): Job<PlagiarismCheckJobData> {
    return {
      id: 'job-1',
      data: {
        articleId: 'a1',
        authorId: 'u1',
        domain: 'TECHNOLOGY',
        title: 'Test Article',
        body: 'This is a unique article about software development practices and modern approaches to building scalable systems.',
        correlationId: 'corr-1',
        ...data,
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<PlagiarismCheckJobData>;
  }

  describe('process clean article', () => {
    it('should mark article as clean when below thresholds', async () => {
      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(createJob());

      expect(prisma.moderationReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({ status: 'CLEAN', isFlagged: false }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.moderation.completed',
        expect.objectContaining({ isFlagged: false }),
      );
    });
  });

  describe('process flagged article', () => {
    it('should flag article when similarity exceeds threshold', async () => {
      const body = 'This is a duplicated content. '.repeat(50);
      const publishedArticle = {
        id: 'pub1',
        title: 'Original',
        body: body,
        slug: 'original',
      };

      prisma.article.findMany.mockResolvedValue([publishedArticle]);

      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(createJob({ body }));

      expect(prisma.moderationReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isFlagged: true }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.moderation.completed',
        expect.objectContaining({ isFlagged: true }),
      );
    });
  });

  describe('DLQ routing on failure', () => {
    it('should route to DLQ after max retries exhausted', async () => {
      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockRejectedValue(new Error('DB error'));

      const job = createJob();
      (job as unknown as { attemptsMade: number }).attemptsMade = 2; // Last attempt

      await expect(processor.process(job)).rejects.toThrow('DB error');

      expect(dlqQueue.add).toHaveBeenCalledWith(
        'dead-letter-plagiarism-check',
        expect.objectContaining({
          articleId: 'a1',
          failedAt: expect.any(String),
          errorMessage: 'DB error',
        }),
        expect.any(Object),
      );
    });
  });

  describe('similarity detection', () => {
    it('should compute zero similarity for unrelated texts', async () => {
      prisma.article.findMany.mockResolvedValue([
        {
          id: 'pub1',
          title: 'Cooking',
          body: 'How to make pasta. Boil water and add noodles. Season with salt.',
          slug: 'cooking',
        },
      ]);

      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(
        createJob({
          body: 'Advanced quantum computing algorithms for cryptographic security research in distributed systems.',
        }),
      );

      const updateCall = prisma.moderationReport.update.mock.calls[0][0];
      expect(updateCall.data.plagiarismScore).toBeLessThan(0.3);
    });

    it('should detect high similarity for identical texts', async () => {
      const commonBody =
        'The architecture of modern web applications requires careful consideration of scalability patterns and data management strategies across distributed systems. '.repeat(
          10,
        );

      prisma.article.findMany.mockResolvedValue([
        { id: 'pub1', title: 'Original', body: commonBody, slug: 'original' },
      ]);

      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(createJob({ body: commonBody }));

      const updateCall = prisma.moderationReport.update.mock.calls[0][0];
      expect(updateCall.data.plagiarismScore).toBeGreaterThan(0.3);
    });
  });

  describe('AI-content detection', () => {
    it('should produce low score for varied human-like text', async () => {
      const humanText = [
        'I was walking down the street yesterday when I noticed something odd.',
        'The building on the corner had been repainted!',
        'Wait, was it always blue?',
        'Hmm, I think it used to be green.',
        'Anyway, moving on.',
        'So then I went to the cafe and ordered my usual.',
        'A cappuccino, extra foam, because why not.',
        'The barista was new, seemed nervous.',
        'Took a while but the coffee was good.',
        'Not great, just good.',
      ].join(' ');

      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(createJob({ body: humanText }));

      const updateCall = prisma.moderationReport.update.mock.calls[0][0];
      expect(updateCall.data.aiContentScore).toBeLessThan(0.6);
    });

    it('should produce higher score for uniform AI-like text', async () => {
      // AI-like: very uniform sentence lengths, repetitive structure
      const aiText = Array.from(
        { length: 20 },
        (_, i) =>
          `The implementation of feature ${i + 1} requires careful consideration of multiple architectural patterns and design principles.`,
      ).join(' ');

      const report = { id: 'r1', status: 'PENDING' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue(report);

      await processor.process(createJob({ body: aiText }));

      const updateCall = prisma.moderationReport.update.mock.calls[0][0];
      // AI-like text should score higher than human-like text
      expect(updateCall.data.aiContentScore).toBeGreaterThan(0.3);
    });
  });
});
