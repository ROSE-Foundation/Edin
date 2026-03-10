import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { ScoringFormulaService } from './scoring-formula.service.js';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import type { Request } from 'express';
import type { ContributorScoresSummaryDto } from '@edin/shared';

@Controller({ path: 'rewards/scores', version: '1' })
@UseGuards(JwtAuthGuard)
export class ScoreController {
  constructor(
    private readonly scoringService: ScoringFormulaService,
    private readonly aggregationService: TemporalAggregationService,
  ) {}

  /**
   * GET /api/v1/rewards/scores — contributor's own scores with temporal aggregates.
   */
  @Get()
  async getMyScores(
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;

    const [scoresResult, aggregates] = await Promise.all([
      this.scoringService.getContributorScores(userId, cursor, parsedLimit),
      this.aggregationService.getContributorAggregates(userId),
    ]);

    const monthlyAggregate = aggregates.find((a) => a.horizon === 'MONTHLY') ?? null;
    const latestSessionScore = scoresResult.items[0] ?? null;

    const summary: ContributorScoresSummaryDto = {
      latestSessionScore,
      monthlyAggregate,
      aggregates,
      recentScores: scoresResult.items,
    };

    return createSuccessResponse(summary, req.correlationId ?? '', {
      total: scoresResult.items.length,
      hasMore: scoresResult.hasMore,
      cursor:
        scoresResult.hasMore && scoresResult.items.length > 0
          ? scoresResult.items[scoresResult.items.length - 1].id
          : null,
    });
  }
}
