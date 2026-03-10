import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  ArticleRewardAllocationDto,
  AuthorRewardSummaryDto,
  EditorRewardSummaryDto,
} from '@edin/shared';

@Injectable()
export class ArticleRewardService {
  private readonly logger = new Logger(ArticleRewardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async allocateReward(
    articleId: string,
    evaluationId: string | null,
    compositeScore: number | null,
  ): Promise<ArticleRewardAllocationDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        authorId: true,
        editorId: true,
        status: true,
      },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const authorSharePercent = article.editorId ? 80 : 100;
    const editorSharePercent = article.editorId ? 20 : 0;

    const allocation = await this.prisma.articleRewardAllocation.upsert({
      where: { articleId },
      create: {
        articleId,
        evaluationId,
        compositeScore,
        authorId: article.authorId,
        editorId: article.editorId,
        authorSharePercent,
        editorSharePercent,
      },
      update: {
        evaluationId,
        compositeScore,
        authorSharePercent,
        editorSharePercent,
        allocatedAt: new Date(),
      },
      include: {
        author: { select: { name: true } },
        editor: { select: { name: true } },
        article: { select: { title: true } },
      },
    });

    this.logger.log('Article reward allocated', {
      module: 'publication-reward',
      articleId,
      authorSharePercent,
      editorSharePercent,
      compositeScore,
    });

    return {
      articleId: allocation.articleId,
      articleTitle: allocation.article.title,
      compositeScore: allocation.compositeScore ? Number(allocation.compositeScore) : null,
      authorId: allocation.authorId,
      authorName: allocation.author.name,
      editorId: allocation.editorId,
      editorName: allocation.editor?.name ?? null,
      authorSharePercent: allocation.authorSharePercent,
      editorSharePercent: allocation.editorSharePercent,
      allocatedAt: allocation.allocatedAt.toISOString(),
    };
  }

  async getArticleRewardAllocation(
    articleId: string,
    userId: string,
  ): Promise<ArticleRewardAllocationDto | null> {
    const allocation = await this.prisma.articleRewardAllocation.findUnique({
      where: { articleId },
      include: {
        author: { select: { name: true } },
        editor: { select: { name: true } },
        article: { select: { title: true, authorId: true, editorId: true } },
      },
    });

    if (!allocation) {
      return null;
    }

    // Authorization: only author, editor, or admin can view
    const user = await this.prisma.contributor.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAuthor = allocation.article.authorId === userId;
    const isEditor = allocation.article.editorId === userId;
    const isAdmin = user?.role === 'ADMIN';

    if (!isAuthor && !isEditor && !isAdmin) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_METRICS_ACCESS_DENIED,
        "You do not have access to this article's reward allocation",
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      articleId: allocation.articleId,
      articleTitle: allocation.article.title,
      compositeScore: allocation.compositeScore ? Number(allocation.compositeScore) : null,
      authorId: allocation.authorId,
      authorName: allocation.author.name,
      editorId: allocation.editorId,
      editorName: allocation.editor?.name ?? null,
      authorSharePercent: allocation.authorSharePercent,
      editorSharePercent: allocation.editorSharePercent,
      allocatedAt: allocation.allocatedAt.toISOString(),
    };
  }

  async getAuthorRewardSummary(authorId: string): Promise<AuthorRewardSummaryDto> {
    const [totalArticles, allocations] = await Promise.all([
      this.prisma.article.count({ where: { authorId, status: 'PUBLISHED' } }),
      this.prisma.articleRewardAllocation.findMany({
        where: { authorId },
        include: {
          author: { select: { name: true } },
          editor: { select: { name: true } },
          article: { select: { title: true } },
        },
        orderBy: { allocatedAt: 'desc' },
      }),
    ]);

    const scores = allocations
      .filter((a) => a.compositeScore !== null)
      .map((a) => Number(a.compositeScore));

    return {
      totalArticles,
      totalEvaluatedArticles: scores.length,
      allocations: allocations.map((a) => ({
        articleId: a.articleId,
        articleTitle: a.article.title,
        compositeScore: a.compositeScore ? Number(a.compositeScore) : null,
        authorId: a.authorId,
        authorName: a.author.name,
        editorId: a.editorId,
        editorName: a.editor?.name ?? null,
        authorSharePercent: a.authorSharePercent,
        editorSharePercent: a.editorSharePercent,
        allocatedAt: a.allocatedAt.toISOString(),
      })),
      averageScore:
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
          : null,
    };
  }

  async getEditorRewardSummary(editorId: string): Promise<EditorRewardSummaryDto> {
    const [totalReviewed, totalPublished, allocations] = await Promise.all([
      this.prisma.article.count({
        where: { editorId, status: { in: ['APPROVED', 'PUBLISHED', 'ARCHIVED'] } },
      }),
      this.prisma.article.count({ where: { editorId, status: 'PUBLISHED' } }),
      this.prisma.articleRewardAllocation.findMany({
        where: { editorId },
        include: {
          author: { select: { name: true } },
          editor: { select: { name: true } },
          article: { select: { title: true } },
        },
        orderBy: { allocatedAt: 'desc' },
      }),
    ]);

    const scores = allocations
      .filter((a) => a.compositeScore !== null)
      .map((a) => Number(a.compositeScore));

    return {
      totalReviewed,
      totalPublished,
      allocations: allocations.map((a) => ({
        articleId: a.articleId,
        articleTitle: a.article.title,
        compositeScore: a.compositeScore ? Number(a.compositeScore) : null,
        authorId: a.authorId,
        authorName: a.author.name,
        editorId: a.editorId,
        editorName: a.editor?.name ?? null,
        authorSharePercent: a.authorSharePercent,
        editorSharePercent: a.editorSharePercent,
        allocatedAt: a.allocatedAt.toISOString(),
      })),
      averageScore:
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100
          : null,
    };
  }

  /**
   * Event listener for article publication.
   * When an article is published, create an initial reward allocation (score pending evaluation).
   */
  @OnEvent('publication.article.published')
  async handleArticlePublished(payload: {
    articleId: string;
    authorId: string;
    editorId: string;
  }): Promise<void> {
    try {
      await this.allocateReward(payload.articleId, null, null);
    } catch (error) {
      this.logger.error('Failed to create initial reward allocation on publish', {
        module: 'publication-reward',
        articleId: payload.articleId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
