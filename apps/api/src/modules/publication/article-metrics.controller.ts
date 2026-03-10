import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ArticleMetricsService } from './article-metrics.service.js';
import { ArticleRewardService } from './article-reward.service.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import type { Request } from 'express';

@Controller({ path: 'articles', version: '1' })
export class ArticleMetricsController {
  constructor(
    private readonly metricsService: ArticleMetricsService,
    private readonly rewardService: ArticleRewardService,
  ) {}

  // ─── Public endpoints (view/engagement tracking) ────────────────────────────

  @Post(':id/metrics/views')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordView(
    @Param('id') articleId: string,
    @Body() body: { referralSource?: string },
    @Req() req: Request,
  ): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const visitorHash = this.generateVisitorHash(ip, userAgent);

    await this.metricsService.recordView(articleId, visitorHash, body.referralSource);
  }

  @Post(':id/metrics/engagement')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateEngagement(
    @Param('id') articleId: string,
    @Body() body: { timeOnPageSeconds?: number; scrollDepthPercent?: number },
    @Req() req: Request,
  ): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const visitorHash = this.generateVisitorHash(ip, userAgent);

    if (body.timeOnPageSeconds !== undefined || body.scrollDepthPercent !== undefined) {
      await this.metricsService.updateEngagement(
        articleId,
        visitorHash,
        body.timeOnPageSeconds ?? 0,
        body.scrollDepthPercent ?? 0,
      );
    }
  }

  // ─── Authenticated endpoints (static routes BEFORE dynamic :id routes) ─────

  @Get('my/reward-summary')
  @UseGuards(JwtAuthGuard)
  async getAuthorRewardSummary(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const summary = await this.rewardService.getAuthorRewardSummary(userId);
    return createSuccessResponse(summary, req.correlationId ?? '');
  }

  @Get('editorial/reward-summary')
  @UseGuards(JwtAuthGuard)
  async getEditorRewardSummary(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const summary = await this.rewardService.getEditorRewardSummary(userId);
    return createSuccessResponse(summary, req.correlationId ?? '');
  }

  @Get(':id/metrics')
  @UseGuards(JwtAuthGuard)
  async getArticleMetrics(
    @Param('id') articleId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const metrics = await this.metricsService.getMetrics(articleId, userId);
    return createSuccessResponse(metrics, req.correlationId ?? '');
  }

  @Get(':id/reward-allocation')
  @UseGuards(JwtAuthGuard)
  async getRewardAllocation(
    @Param('id') articleId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const allocation = await this.rewardService.getArticleRewardAllocation(articleId, userId);
    return createSuccessResponse(allocation, req.correlationId ?? '');
  }

  private generateVisitorHash(ip: string, userAgent: string): string {
    return createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
  }
}
