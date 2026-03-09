import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EditorialService } from './editorial.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockArticle = {
  id: 'article-uuid',
  authorId: 'author-uuid',
  title: 'Test Article',
  slug: 'test-article-abc123',
  abstract: 'A test abstract that is long enough for validation.',
  body: 'A'.repeat(600),
  domain: 'Technology' as const,
  status: 'SUBMITTED' as const,
  version: 1,
  editorId: null as string | null,
  createdAt: new Date('2026-03-09T10:00:00Z'),
  updatedAt: new Date('2026-03-09T10:00:00Z'),
  submittedAt: new Date('2026-03-09T10:00:00Z'),
  publishedAt: null as Date | null,
};

const mockEditor = {
  id: 'editor-uuid',
  editedArticles: [],
};

const mockPrismaService = {
  article: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  contributor: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  editorialFeedback: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  inlineComment: {
    createMany: vi.fn(),
  },
  articleVersion: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  editorEligibilityCriteria: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('EditorialService', () => {
  let service: EditorialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditorialService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EditorialService>(EditorialService);

    vi.clearAllMocks();

    // Default mock for editor eligibility criteria (used by assignEditor)
    mockPrismaService.editorEligibilityCriteria.findUnique.mockResolvedValue({
      maxConcurrentAssignments: 5,
    });
  });

  describe('assignEditor', () => {
    it('should assign editor with domain match and fewest active assignments', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.contributor.findMany.mockResolvedValueOnce([
        { id: 'editor-1', editedArticles: [{ id: 'a1' }, { id: 'a2' }] },
        { id: 'editor-2', editedArticles: [] },
        { id: 'editor-3', editedArticles: [{ id: 'a3' }] },
      ]);
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        editorId: 'editor-2',
        status: 'EDITORIAL_REVIEW',
      });

      await service.assignEditor('article-uuid', 'corr-1');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article-uuid' },
        data: { editorId: 'editor-2', status: 'EDITORIAL_REVIEW' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.assigned',
        expect.objectContaining({
          articleId: 'article-uuid',
          editorId: 'editor-2',
        }),
      );
    });

    it('should emit unavailable event when no eligible editors exist', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.contributor.findMany
        .mockResolvedValueOnce([]) // No EDITOR role contributors
        .mockResolvedValueOnce([]); // No ADMIN fallback

      await service.assignEditor('article-uuid', 'corr-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.editor.unavailable',
        expect.objectContaining({ articleId: 'article-uuid' }),
      );
      expect(mockPrismaService.article.update).not.toHaveBeenCalled();
    });

    it('should throw if article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.assignEditor('missing', 'corr-1')).rejects.toThrow(DomainException);
    });

    it('should skip assignment if article is not in SUBMITTED status', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: 'DRAFT',
      });

      await service.assignEditor('article-uuid', 'corr-1');

      expect(mockPrismaService.contributor.findMany).not.toHaveBeenCalled();
    });

    it('should use ADMIN as fallback editor when no EDITOR role matches', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.contributor.findMany
        .mockResolvedValueOnce([]) // No EDITOR role
        .mockResolvedValueOnce([{ id: 'admin-uuid', editedArticles: [] }]); // Admin fallback
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        editorId: 'admin-uuid',
        status: 'EDITORIAL_REVIEW',
      });

      await service.assignEditor('article-uuid', 'corr-1');

      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: 'article-uuid' },
        data: { editorId: 'admin-uuid', status: 'EDITORIAL_REVIEW' },
      });
    });
  });

  describe('getEditorialView', () => {
    it('should return article with feedback history and versions', async () => {
      const articleWithEditor = {
        ...mockArticle,
        editorId: 'editor-uuid',
        status: 'EDITORIAL_REVIEW',
      };
      mockPrismaService.article.findUnique.mockResolvedValue(articleWithEditor);
      mockPrismaService.editorialFeedback.findMany.mockResolvedValue([]);
      mockPrismaService.articleVersion.findMany.mockResolvedValue([]);

      const result = await service.getEditorialView('article-uuid', 'editor-uuid');

      expect(result.article.id).toBe('article-uuid');
      expect(result.feedbackHistory).toEqual([]);
      expect(result.versions).toEqual([]);
    });

    it('should throw if user is not the assigned editor', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        editorId: 'other-editor',
        status: 'EDITORIAL_REVIEW',
      });

      await expect(service.getEditorialView('article-uuid', 'wrong-editor')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw if article not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.getEditorialView('missing', 'editor-uuid')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('submitFeedback', () => {
    const articleInReview = {
      ...mockArticle,
      editorId: 'editor-uuid',
      status: 'EDITORIAL_REVIEW' as const,
    };

    it('should create feedback with APPROVE decision and transition to APPROVED', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(articleInReview);

      const createdFeedback = {
        id: 'fb-uuid',
        articleId: 'article-uuid',
        editorId: 'editor-uuid',
        decision: 'APPROVE',
        overallAssessment: 'Excellent work, ready for publication.',
        revisionRequests: null,
        articleVersion: 1,
        createdAt: new Date(),
        inlineComments: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            editorialFeedback: {
              create: vi.fn().mockResolvedValue(createdFeedback),
              findUnique: vi.fn().mockResolvedValue(createdFeedback),
            },
            inlineComment: { createMany: vi.fn() },
            article: { update: vi.fn() },
          };
          return fn(tx);
        },
      );

      const result = await service.submitFeedback(
        'article-uuid',
        'editor-uuid',
        {
          decision: 'APPROVE',
          overallAssessment: 'Excellent work, ready for publication.',
          revisionRequests: [],
          inlineComments: [],
        },
        'corr-1',
      );

      expect(result.decision).toBe('APPROVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.approved',
        expect.objectContaining({ articleId: 'article-uuid' }),
      );
    });

    it('should create feedback with REQUEST_REVISIONS and transition to REVISION_REQUESTED', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(articleInReview);

      const createdFeedback = {
        id: 'fb-uuid',
        articleId: 'article-uuid',
        editorId: 'editor-uuid',
        decision: 'REQUEST_REVISIONS',
        overallAssessment: 'Good start but needs revision.',
        revisionRequests: [{ id: 'rr-1', description: 'Fix intro', resolved: false }],
        articleVersion: 1,
        createdAt: new Date(),
        inlineComments: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            editorialFeedback: {
              create: vi.fn().mockResolvedValue(createdFeedback),
              findUnique: vi.fn().mockResolvedValue(createdFeedback),
            },
            inlineComment: { createMany: vi.fn() },
            article: { update: vi.fn() },
          };
          return fn(tx);
        },
      );

      const result = await service.submitFeedback(
        'article-uuid',
        'editor-uuid',
        {
          decision: 'REQUEST_REVISIONS',
          overallAssessment: 'Good start but needs revision.',
          revisionRequests: [{ description: 'Fix intro' }],
          inlineComments: [],
        },
        'corr-1',
      );

      expect(result.decision).toBe('REQUEST_REVISIONS');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.revision-requested',
        expect.objectContaining({ articleId: 'article-uuid' }),
      );
    });

    it('should create feedback with REJECT and transition to ARCHIVED', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(articleInReview);

      const createdFeedback = {
        id: 'fb-uuid',
        articleId: 'article-uuid',
        editorId: 'editor-uuid',
        decision: 'REJECT',
        overallAssessment: 'Does not meet editorial standards.',
        revisionRequests: null,
        articleVersion: 1,
        createdAt: new Date(),
        inlineComments: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            editorialFeedback: {
              create: vi.fn().mockResolvedValue(createdFeedback),
              findUnique: vi.fn().mockResolvedValue(createdFeedback),
            },
            inlineComment: { createMany: vi.fn() },
            article: { update: vi.fn() },
          };
          return fn(tx);
        },
      );

      const result = await service.submitFeedback(
        'article-uuid',
        'editor-uuid',
        {
          decision: 'REJECT',
          overallAssessment: 'Does not meet editorial standards.',
          revisionRequests: [],
          inlineComments: [],
        },
        'corr-1',
      );

      expect(result.decision).toBe('REJECT');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.rejected',
        expect.objectContaining({ articleId: 'article-uuid' }),
      );
    });

    it('should throw if editor is not assigned', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        editorId: 'other-editor',
        status: 'EDITORIAL_REVIEW',
      });

      await expect(
        service.submitFeedback(
          'article-uuid',
          'wrong-editor',
          {
            decision: 'APPROVE',
            overallAssessment: 'Some assessment text here.',
            revisionRequests: [],
            inlineComments: [],
          },
          'corr-1',
        ),
      ).rejects.toThrow(DomainException);
    });

    it('should throw if article is not in EDITORIAL_REVIEW status', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        editorId: 'editor-uuid',
        status: 'DRAFT',
      });

      await expect(
        service.submitFeedback(
          'article-uuid',
          'editor-uuid',
          {
            decision: 'APPROVE',
            overallAssessment: 'Some assessment text here.',
            revisionRequests: [],
            inlineComments: [],
          },
          'corr-1',
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getAuthorRevisionView', () => {
    it('should return article with feedback and editor profile', async () => {
      const articleWithRevisions = {
        ...mockArticle,
        editorId: 'editor-uuid',
        status: 'REVISION_REQUESTED',
      };
      mockPrismaService.article.findUnique.mockResolvedValue(articleWithRevisions);
      mockPrismaService.editorialFeedback.findMany.mockResolvedValue([
        {
          id: 'fb-1',
          articleId: 'article-uuid',
          editorId: 'editor-uuid',
          decision: 'REQUEST_REVISIONS',
          overallAssessment: 'Needs work.',
          revisionRequests: [{ id: 'rr-1', description: 'Fix intro', resolved: false }],
          articleVersion: 1,
          createdAt: new Date(),
          inlineComments: [],
        },
      ]);
      mockPrismaService.contributor.findUnique.mockResolvedValue({
        id: 'editor-uuid',
        name: 'Marcus Editor',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const result = await service.getAuthorRevisionView('article-uuid', 'author-uuid');

      expect(result.article.id).toBe('article-uuid');
      expect(result.latestFeedback?.decision).toBe('REQUEST_REVISIONS');
      expect(result.editorProfile?.displayName).toBe('Marcus Editor');
    });

    it('should throw if user is not the author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      await expect(service.getAuthorRevisionView('article-uuid', 'wrong-author')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('resubmitArticle', () => {
    it('should create version snapshot, update body, and transition to SUBMITTED', async () => {
      const articleRevisionRequested = {
        ...mockArticle,
        editorId: 'editor-uuid',
        status: 'REVISION_REQUESTED' as const,
      };
      mockPrismaService.article.findUnique.mockResolvedValue(articleRevisionRequested);

      const updatedArticle = {
        ...articleRevisionRequested,
        body: 'B'.repeat(600),
        version: 2,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            articleVersion: { create: vi.fn() },
            article: { update: vi.fn().mockResolvedValue(updatedArticle) },
          };
          return fn(tx);
        },
      );

      const result = await service.resubmitArticle(
        'article-uuid',
        'author-uuid',
        'B'.repeat(600),
        'corr-1',
      );

      expect(result.status).toBe('SUBMITTED');
      expect(result.version).toBe(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.submitted',
        expect.objectContaining({ articleId: 'article-uuid' }),
      );
    });

    it('should throw if article is not in REVISION_REQUESTED status', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle); // Status: DRAFT

      await expect(
        service.resubmitArticle('article-uuid', 'author-uuid', 'B'.repeat(600), 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('should throw if user is not the author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue({
        ...mockArticle,
        status: 'REVISION_REQUESTED',
      });

      await expect(
        service.resubmitArticle('article-uuid', 'wrong-author', 'B'.repeat(600), 'corr-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getArticleVersions', () => {
    it('should return version list for author', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.articleVersion.findMany.mockResolvedValue([
        { versionNumber: 1, createdAt: new Date('2026-03-09T10:00:00Z') },
      ]);

      const result = await service.getArticleVersions('article-uuid', 'author-uuid');

      expect(result).toHaveLength(1);
      expect(result[0].versionNumber).toBe(1);
    });

    it('should throw if user is neither author nor editor', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      await expect(service.getArticleVersions('article-uuid', 'stranger')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getArticleVersion', () => {
    it('should return specific version body', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.articleVersion.findFirst.mockResolvedValue({
        versionNumber: 1,
        body: 'Version 1 body',
        createdAt: new Date('2026-03-09T10:00:00Z'),
      });

      const result = await service.getArticleVersion('article-uuid', 1, 'author-uuid');

      expect(result.versionNumber).toBe(1);
      expect(result.body).toBe('Version 1 body');
    });

    it('should throw if version not found', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.articleVersion.findFirst.mockResolvedValue(null);

      await expect(service.getArticleVersion('article-uuid', 99, 'author-uuid')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('publishArticle', () => {
    it('should transition APPROVED article to PUBLISHED', async () => {
      const approvedArticle = {
        ...mockArticle,
        status: 'APPROVED' as const,
        editorId: 'editor-uuid',
      };
      mockPrismaService.article.findUnique.mockResolvedValue(approvedArticle);

      const publishedArticle = {
        ...approvedArticle,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
      mockPrismaService.article.update.mockResolvedValue(publishedArticle);

      const result = await service.publishArticle('article-uuid', 'admin-uuid', 'corr-1');

      expect(result.status).toBe('PUBLISHED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.published',
        expect.objectContaining({
          articleId: 'article-uuid',
          editorId: 'editor-uuid',
        }),
      );
    });

    it('should throw if article is not in APPROVED status', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle); // Status: SUBMITTED

      await expect(service.publishArticle('article-uuid', 'admin-uuid', 'corr-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('handleArticleSubmitted', () => {
    it('should call assignEditor when event is received', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.contributor.findMany.mockResolvedValueOnce([mockEditor]);
      mockPrismaService.article.update.mockResolvedValue({
        ...mockArticle,
        editorId: 'editor-uuid',
        status: 'EDITORIAL_REVIEW',
      });

      await service.handleArticleSubmitted({
        articleId: 'article-uuid',
        authorId: 'author-uuid',
        domain: 'Technology',
        title: 'Test Article',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
      });

      expect(mockPrismaService.article.update).toHaveBeenCalled();
    });
  });
});
