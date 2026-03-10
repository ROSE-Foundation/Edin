import { Test, TestingModule } from '@nestjs/testing';
import { ArticleRewardService } from './article-reward.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

describe('ArticleRewardService', () => {
  let service: ArticleRewardService;

  const mockPrisma = {
    article: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    articleRewardAllocation: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    contributor: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleRewardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ArticleRewardService>(ArticleRewardService);
    vi.clearAllMocks();
  });

  describe('allocateReward', () => {
    it('should allocate 80/20 split when article has an editor', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        title: 'Test Article',
        authorId: 'author-1',
        editorId: 'editor-1',
        status: 'PUBLISHED',
      });
      mockPrisma.articleRewardAllocation.upsert.mockResolvedValue({
        articleId: 'art-1',
        compositeScore: null,
        authorId: 'author-1',
        editorId: 'editor-1',
        authorSharePercent: 80,
        editorSharePercent: 20,
        allocatedAt: new Date('2026-03-10T12:00:00Z'),
        article: { title: 'Test Article' },
        author: { name: 'Author Name' },
        editor: { name: 'Editor Name' },
      });

      const result = await service.allocateReward('art-1', null, null);

      expect(result.authorSharePercent).toBe(80);
      expect(result.editorSharePercent).toBe(20);
      expect(result.editorName).toBe('Editor Name');
      expect(mockPrisma.articleRewardAllocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            authorSharePercent: 80,
            editorSharePercent: 20,
          }),
        }),
      );
    });

    it('should allocate 100/0 split when article has no editor', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-2',
        title: 'Solo Article',
        authorId: 'author-1',
        editorId: null,
        status: 'PUBLISHED',
      });
      mockPrisma.articleRewardAllocation.upsert.mockResolvedValue({
        articleId: 'art-2',
        compositeScore: null,
        authorId: 'author-1',
        editorId: null,
        authorSharePercent: 100,
        editorSharePercent: 0,
        allocatedAt: new Date('2026-03-10T12:00:00Z'),
        article: { title: 'Solo Article' },
        author: { name: 'Author Name' },
        editor: null,
      });

      const result = await service.allocateReward('art-2', null, null);

      expect(result.authorSharePercent).toBe(100);
      expect(result.editorSharePercent).toBe(0);
      expect(result.editorName).toBeNull();
    });

    it('should throw DomainException for non-existent article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.allocateReward('non-existent', null, null)).rejects.toThrow(
        DomainException,
      );
    });

    it('should pass composite score through allocation', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        title: 'Scored Article',
        authorId: 'author-1',
        editorId: 'editor-1',
        status: 'PUBLISHED',
      });
      mockPrisma.articleRewardAllocation.upsert.mockResolvedValue({
        articleId: 'art-1',
        compositeScore: 85.5,
        authorId: 'author-1',
        editorId: 'editor-1',
        authorSharePercent: 80,
        editorSharePercent: 20,
        allocatedAt: new Date('2026-03-10T12:00:00Z'),
        article: { title: 'Scored Article' },
        author: { name: 'Author' },
        editor: { name: 'Editor' },
      });

      const result = await service.allocateReward('art-1', 'eval-1', 85.5);

      expect(result.compositeScore).toBe(85.5);
      expect(mockPrisma.articleRewardAllocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            evaluationId: 'eval-1',
            compositeScore: 85.5,
          }),
        }),
      );
    });
  });

  describe('getArticleRewardAllocation', () => {
    it('should return allocation when found and user is author', async () => {
      mockPrisma.articleRewardAllocation.findUnique.mockResolvedValue({
        articleId: 'art-1',
        compositeScore: 75,
        authorId: 'author-1',
        editorId: 'editor-1',
        authorSharePercent: 80,
        editorSharePercent: 20,
        allocatedAt: new Date('2026-03-10T12:00:00Z'),
        article: { title: 'My Article', authorId: 'author-1', editorId: 'editor-1' },
        author: { name: 'Author' },
        editor: { name: 'Editor' },
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

      const result = await service.getArticleRewardAllocation('art-1', 'author-1');

      expect(result).not.toBeNull();
      expect(result!.articleTitle).toBe('My Article');
      expect(result!.compositeScore).toBe(75);
    });

    it('should return null when no allocation exists', async () => {
      mockPrisma.articleRewardAllocation.findUnique.mockResolvedValue(null);

      const result = await service.getArticleRewardAllocation('art-1', 'author-1');

      expect(result).toBeNull();
    });

    it('should deny access to non-owner non-admin users', async () => {
      mockPrisma.articleRewardAllocation.findUnique.mockResolvedValue({
        articleId: 'art-1',
        compositeScore: 75,
        authorId: 'author-1',
        editorId: 'editor-1',
        authorSharePercent: 80,
        editorSharePercent: 20,
        allocatedAt: new Date('2026-03-10T12:00:00Z'),
        article: { title: 'My Article', authorId: 'author-1', editorId: 'editor-1' },
        author: { name: 'Author' },
        editor: { name: 'Editor' },
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

      await expect(service.getArticleRewardAllocation('art-1', 'other-user')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getAuthorRewardSummary', () => {
    it('should return summary with average score', async () => {
      mockPrisma.article.count.mockResolvedValue(3);
      mockPrisma.articleRewardAllocation.findMany.mockResolvedValue([
        {
          articleId: 'a1',
          compositeScore: 80,
          authorId: 'author-1',
          editorId: 'e1',
          authorSharePercent: 80,
          editorSharePercent: 20,
          allocatedAt: new Date('2026-03-10T12:00:00Z'),
          article: { title: 'Article 1' },
          author: { name: 'Author' },
          editor: { name: 'Editor' },
        },
        {
          articleId: 'a2',
          compositeScore: 90,
          authorId: 'author-1',
          editorId: null,
          authorSharePercent: 100,
          editorSharePercent: 0,
          allocatedAt: new Date('2026-03-09T12:00:00Z'),
          article: { title: 'Article 2' },
          author: { name: 'Author' },
          editor: null,
        },
      ]);

      const result = await service.getAuthorRewardSummary('author-1');

      expect(result.totalArticles).toBe(3);
      expect(result.totalEvaluatedArticles).toBe(2);
      expect(result.averageScore).toBe(85);
      expect(result.allocations).toHaveLength(2);
    });

    it('should return null averageScore when no scores exist', async () => {
      mockPrisma.article.count.mockResolvedValue(1);
      mockPrisma.articleRewardAllocation.findMany.mockResolvedValue([
        {
          articleId: 'a1',
          compositeScore: null,
          authorId: 'author-1',
          editorId: null,
          authorSharePercent: 100,
          editorSharePercent: 0,
          allocatedAt: new Date(),
          article: { title: 'Unscored' },
          author: { name: 'Author' },
          editor: null,
        },
      ]);

      const result = await service.getAuthorRewardSummary('author-1');

      expect(result.averageScore).toBeNull();
      expect(result.totalEvaluatedArticles).toBe(0);
    });
  });

  describe('getEditorRewardSummary', () => {
    it('should return editor summary with review counts', async () => {
      mockPrisma.article.count
        .mockResolvedValueOnce(5) // totalReviewed
        .mockResolvedValueOnce(3); // totalPublished
      mockPrisma.articleRewardAllocation.findMany.mockResolvedValue([
        {
          articleId: 'a1',
          compositeScore: 70,
          authorId: 'au-1',
          editorId: 'editor-1',
          authorSharePercent: 80,
          editorSharePercent: 20,
          allocatedAt: new Date(),
          article: { title: 'Article 1' },
          author: { name: 'Author 1' },
          editor: { name: 'Editor' },
        },
      ]);

      const result = await service.getEditorRewardSummary('editor-1');

      expect(result.totalReviewed).toBe(5);
      expect(result.totalPublished).toBe(3);
      expect(result.averageScore).toBe(70);
      expect(result.allocations).toHaveLength(1);
    });
  });

  describe('handleArticlePublished', () => {
    it('should call allocateReward with null score on publish event', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'art-1',
        title: 'Published Article',
        authorId: 'author-1',
        editorId: 'editor-1',
        status: 'PUBLISHED',
      });
      mockPrisma.articleRewardAllocation.upsert.mockResolvedValue({
        articleId: 'art-1',
        compositeScore: null,
        authorId: 'author-1',
        editorId: 'editor-1',
        authorSharePercent: 80,
        editorSharePercent: 20,
        allocatedAt: new Date(),
        article: { title: 'Published Article' },
        author: { name: 'Author' },
        editor: { name: 'Editor' },
      });

      await service.handleArticlePublished({
        articleId: 'art-1',
        authorId: 'author-1',
        editorId: 'editor-1',
      });

      expect(mockPrisma.articleRewardAllocation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { articleId: 'art-1' },
          create: expect.objectContaining({
            evaluationId: null,
            compositeScore: null,
          }),
        }),
      );
    });

    it('should not throw when allocation fails', async () => {
      mockPrisma.article.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(
        service.handleArticlePublished({
          articleId: 'art-1',
          authorId: 'author-1',
          editorId: 'editor-1',
        }),
      ).resolves.not.toThrow();
    });
  });
});
