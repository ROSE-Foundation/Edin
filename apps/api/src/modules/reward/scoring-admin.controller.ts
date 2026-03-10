import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ScoringFormulaService } from './scoring-formula.service.js';
import { TemporalAggregationService } from './temporal-aggregation.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';
import { z } from 'zod';

const createFormulaSchema = z.object({
  aiEvalWeight: z.number().min(0).max(1),
  peerFeedbackWeight: z.number().min(0).max(1),
  complexityWeight: z.number().min(0).max(1),
  domainNormWeight: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
});

const paginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

@Controller({ path: 'admin/scoring', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ScoringAdminController {
  constructor(
    private readonly scoringService: ScoringFormulaService,
    private readonly aggregationService: TemporalAggregationService,
  ) {}

  /**
   * POST /api/v1/admin/scoring/formula — create new formula version.
   */
  @Post('formula')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async createFormulaVersion(
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = createFormulaSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid formula weights',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const formula = await this.scoringService.createFormulaVersion(parsed.data, userId);
    return createSuccessResponse(formula, req.correlationId ?? '');
  }

  /**
   * GET /api/v1/admin/scoring/formula/history — formula version history.
   */
  @Get('formula/history')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getFormulaHistory(
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = paginationQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.scoringService.getFormulaHistory(
      parsed.data.cursor,
      parsed.data.limit,
    );

    return createSuccessResponse(result.items, req.correlationId ?? '', {
      total: result.items.length,
      hasMore: result.hasMore,
      cursor:
        result.hasMore && result.items.length > 0 ? result.items[result.items.length - 1].id : null,
    });
  }

  /**
   * GET /api/v1/admin/scoring/formula/active — get current active formula.
   */
  @Get('formula/active')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getActiveFormula(@Req() req: Request & { correlationId?: string }) {
    const formula = await this.scoringService.getActiveFormula();

    if (!formula) {
      throw new DomainException(
        ERROR_CODES.SCORING_FORMULA_NOT_FOUND,
        'No active scoring formula found',
        HttpStatus.NOT_FOUND,
      );
    }

    return createSuccessResponse(formula, req.correlationId ?? '');
  }

  /**
   * GET /api/v1/admin/scoring/scores/:contributorId — admin view of any contributor's scores.
   */
  @Get('scores/:contributorId')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getContributorScores(
    @Param('contributorId') contributorId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = paginationQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const [scoresResult, aggregates] = await Promise.all([
      this.scoringService.getContributorScores(
        contributorId,
        parsed.data.cursor,
        parsed.data.limit,
      ),
      this.aggregationService.getContributorAggregates(contributorId),
    ]);

    const summary = {
      latestSessionScore: scoresResult.items[0] ?? null,
      monthlyAggregate: aggregates.find((a) => a.horizon === 'MONTHLY') ?? null,
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
