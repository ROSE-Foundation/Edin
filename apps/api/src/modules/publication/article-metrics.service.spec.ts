import { Test, TestingModule } from '@nestjs/testing';
import { ArticleMetricsService } from './article-metrics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

describe('ArticleMetricsService', () => {
  let service: ArticleMetricsService;

  const mockPrisma = {
    article: {
      findUnique: vi.fn(),
    },
    articleView: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    contributor: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleMetricsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ArticleMetricsService>(ArticleMetricsService);
    vi.clearAllMocks();
  });

  describe('recordView', () => {
    it('should record a view for a published article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', status: 'PUBLISHED' });
      mockPrisma.articleView.findFirst.mockResolvedValue(null);
      mockPrisma.articleView.create.mockResolvedValue({ id: 'view-1' });

      await service.recordView('art-1', 'hash123', 'https://google.com');

      expect(mockPrisma.articleView.create).toHaveBeenCalledWith({
        data: {
          articleId: 'art-1',
          visitorHash: 'hash123',
          referralSource: 'https://google.com',
        },
      });
    });

    it('should deduplicate views within 24-hour window', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', status: 'PUBLISHED' });
      mockPrisma.articleView.findFirst.mockResolvedValue({ id: 'existing-view' });

      await service.recordView('art-1', 'hash123');

      expect(mockPrisma.articleView.create).not.toHaveBeenCalled();
    });

    it('should silently ignore views for non-published articles', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'art-1', status: 'DRAFT' });

      await service.recordView('art-1', 'hash123');

      expect(mockPrisma.articleView.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.articleView.create).not.toHaveBeenCalled();
    });

    it('should silently ignore views for non-existent articles', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await service.recordView('non-existent', 'hash123');

      expect(mockPrisma.articleView.create).not.toHaveBeenCalled();
    });
  });

  describe('updateEngagement', () => {
    it('should update engagement for latest view', async () => {
      mockPrisma.articleView.findFirst.mockResolvedValue({ id: 'view-1' });
      mockPrisma.articleView.update.mockResolvedValue({ id: 'view-1' });

      await service.updateEngagement('art-1', 'hash123', 120, 75);

      expect(mockPrisma.articleView.update).toHaveBeenCalledWith({
        where: { id: 'view-1' },
        data: {
          timeOnPageSeconds: 120,
          scrollDepthPercent: 75,
        },
      });
    });

    it('should clamp values to valid ranges', async () => {
      mockPrisma.articleView.findFirst.mockResolvedValue({ id: 'view-1' });
      mockPrisma.articleView.update.mockResolvedValue({ id: 'view-1' });

      await service.updateEngagement('art-1', 'hash123', 9999, 200);

      expect(mockPrisma.articleView.update).toHaveBeenCalledWith({
        where: { id: 'view-1' },
        data: {
          timeOnPageSeconds: 3600,
          scrollDepthPercent: 100,
        },
      });
    });

    it('should do nothing if no matching view found', async () => {
      mockPrisma.articleView.findFirst.mockResolvedValue(null);

      await service.updateEngagement('art-1', 'hash123', 120, 75);

      expect(mockPrisma.articleView.update).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return embargo state when within 48 hours of publication', async () => {
      const publishedAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        authorId: 'user-1',
        editorId: null,
        status: 'PUBLISHED',
        publishedAt,
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

      const result = await service.getMetrics('art-1', 'user-1');

      expect(result.isEmbargoed).toBe(true);
      expect(result.totalViews).toBe(0);
      expect(result.embargoEndsAt).toBeTruthy();
    });

    it('should return metrics when embargo has passed', async () => {
      const publishedAt = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h ago
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        authorId: 'user-1',
        editorId: null,
        status: 'PUBLISHED',
        publishedAt,
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });
      mockPrisma.articleView.count.mockResolvedValue(42);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(35) }]) // getUniqueViews
        .mockResolvedValueOnce([{ date: '2026-03-08', views: BigInt(10) }]); // getDailyViews
      mockPrisma.articleView.groupBy.mockResolvedValue([
        { referralSource: 'https://google.com', _count: { referralSource: 5 } },
      ]);
      mockPrisma.articleView.aggregate.mockResolvedValue({
        _avg: { timeOnPageSeconds: 180, scrollDepthPercent: 65 },
      });

      const result = await service.getMetrics('art-1', 'user-1');

      expect(result.isEmbargoed).toBe(false);
      expect(result.totalViews).toBe(42);
      expect(result.uniqueViews).toBe(35);
      expect(result.viewsOverTime).toHaveLength(1);
    });

    it('should deny access to non-owner non-admin users', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        authorId: 'user-1',
        editorId: 'user-2',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

      await expect(service.getMetrics('art-1', 'other-user')).rejects.toThrow(DomainException);
    });

    it('should allow admin access', async () => {
      const publishedAt = new Date(Date.now() - 72 * 60 * 60 * 1000);
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        authorId: 'user-1',
        editorId: null,
        status: 'PUBLISHED',
        publishedAt,
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.articleView.count.mockResolvedValue(10);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(8) }]) // getUniqueViews
        .mockResolvedValueOnce([]); // getDailyViews
      mockPrisma.articleView.groupBy.mockResolvedValue([]);
      mockPrisma.articleView.aggregate.mockResolvedValue({
        _avg: { timeOnPageSeconds: null, scrollDepthPercent: null },
      });

      const result = await service.getMetrics('art-1', 'admin-user');

      expect(result.isEmbargoed).toBe(false);
    });

    it('should throw for non-existent article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.getMetrics('non-existent', 'user-1')).rejects.toThrow(DomainException);
    });
  });
});
