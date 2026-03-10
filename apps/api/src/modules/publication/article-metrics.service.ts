import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { ArticleMetricsDto, ReferralSourceDto, DailyViewsDto } from '@edin/shared';

const EMBARGO_HOURS = 48;
const DEDUP_WINDOW_HOURS = 24;

@Injectable()
export class ArticleMetricsService {
  private readonly logger = new Logger(ArticleMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordView(
    articleId: string,
    visitorHash: string,
    referralSource?: string | null,
  ): Promise<void> {
    // Verify article exists and is published
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article || article.status !== 'PUBLISHED') {
      return; // Silently ignore views for non-published articles
    }

    // Dedup: check if same visitor viewed in the last 24 hours
    const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
    const recentView = await this.prisma.articleView.findFirst({
      where: {
        articleId,
        visitorHash,
        viewedAt: { gte: dedupCutoff },
      },
      select: { id: true },
    });

    if (recentView) {
      return; // Duplicate view within window
    }

    await this.prisma.articleView.create({
      data: {
        articleId,
        visitorHash,
        referralSource: referralSource || null,
      },
    });

    this.logger.debug('Article view recorded', {
      module: 'publication-metrics',
      articleId,
    });
  }

  async updateEngagement(
    articleId: string,
    visitorHash: string,
    timeOnPageSeconds: number,
    scrollDepthPercent: number,
  ): Promise<void> {
    // Find the most recent view from this visitor for this article
    const latestView = await this.prisma.articleView.findFirst({
      where: { articleId, visitorHash },
      orderBy: { viewedAt: 'desc' },
      select: { id: true },
    });

    if (!latestView) {
      return; // No view to update
    }

    await this.prisma.articleView.update({
      where: { id: latestView.id },
      data: {
        timeOnPageSeconds: Math.max(0, Math.min(timeOnPageSeconds, 3600)),
        scrollDepthPercent: Math.max(0, Math.min(scrollDepthPercent, 100)),
      },
    });
  }

  async getMetrics(articleId: string, userId: string): Promise<ArticleMetricsDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        authorId: true,
        editorId: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Check access: author, editor, or admin
    const user = await this.prisma.contributor.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAuthor = article.authorId === userId;
    const isEditor = article.editorId === userId;
    const isAdmin = user?.role === 'ADMIN';

    if (!isAuthor && !isEditor && !isAdmin) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_METRICS_ACCESS_DENIED,
        "You do not have access to this article's metrics",
        HttpStatus.FORBIDDEN,
      );
    }

    // Check 48-hour embargo
    if (article.publishedAt) {
      const embargoEnd = new Date(article.publishedAt.getTime() + EMBARGO_HOURS * 60 * 60 * 1000);
      if (new Date() < embargoEnd) {
        return {
          totalViews: 0,
          uniqueViews: 0,
          avgTimeOnPageSeconds: null,
          avgScrollDepthPercent: null,
          referralSources: [],
          viewsOverTime: [],
          isEmbargoed: true,
          embargoEndsAt: embargoEnd.toISOString(),
        };
      }
    }

    // Aggregate metrics
    const [totalViews, uniqueViews, engagementAgg, referralSources, dailyViews] = await Promise.all(
      [
        this.prisma.articleView.count({ where: { articleId } }),
        this.getUniqueViews(articleId),
        this.prisma.articleView.aggregate({
          where: { articleId, timeOnPageSeconds: { not: null } },
          _avg: { timeOnPageSeconds: true, scrollDepthPercent: true },
        }),
        this.getReferralSources(articleId),
        this.getDailyViews(articleId),
      ],
    );

    return {
      totalViews,
      uniqueViews,
      avgTimeOnPageSeconds: engagementAgg._avg.timeOnPageSeconds ?? null,
      avgScrollDepthPercent: engagementAgg._avg.scrollDepthPercent ?? null,
      referralSources,
      viewsOverTime: dailyViews,
      isEmbargoed: false,
      embargoEndsAt: null,
    };
  }

  async getAuthorMetricsSummary(
    authorId: string,
  ): Promise<{ totalViews: number; totalArticles: number }> {
    const articles = await this.prisma.article.findMany({
      where: { authorId, status: 'PUBLISHED' },
      select: { id: true },
    });

    if (articles.length === 0) {
      return { totalViews: 0, totalArticles: 0 };
    }

    const totalViews = await this.prisma.articleView.count({
      where: { articleId: { in: articles.map((a) => a.id) } },
    });

    return { totalViews, totalArticles: articles.length };
  }

  private async getUniqueViews(articleId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT visitor_hash) as count
      FROM publication.article_views
      WHERE article_id = ${articleId}::uuid
    `;
    return Number(result[0].count);
  }

  private async getReferralSources(articleId: string): Promise<ReferralSourceDto[]> {
    const results = await this.prisma.articleView.groupBy({
      by: ['referralSource'],
      where: { articleId, referralSource: { not: null } },
      _count: { referralSource: true },
      orderBy: { _count: { referralSource: 'desc' } },
      take: 20,
    });

    return results.map((r) => ({
      source: r.referralSource!,
      count: r._count.referralSource,
    }));
  }

  private async getDailyViews(articleId: string): Promise<DailyViewsDto[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<{ date: string; views: bigint }[]>`
      SELECT DATE(viewed_at) as date, COUNT(*) as views
      FROM publication.article_views
      WHERE article_id = ${articleId}::uuid AND viewed_at >= ${thirtyDaysAgo}
      GROUP BY DATE(viewed_at)
      ORDER BY date ASC
    `;

    return rows.map((row) => ({
      date:
        typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0],
      views: Number(row.views),
    }));
  }
}
