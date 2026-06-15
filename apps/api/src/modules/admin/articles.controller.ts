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
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AdminArticlesService } from './articles.service.js';
import {
  Action,
  ERROR_CODES,
  adminArticleTransitionSchema,
  articleDomainEnum,
  ARTICLE_STATUSES,
} from '@edin/shared';
import type { Request } from 'express';
import { z } from 'zod';

interface CurrentUserPayload {
  id: string;
  role: string;
}

const listQuerySchema = z.object({
  status: z.enum(ARTICLE_STATUSES).optional(),
  domain: articleDomainEnum.optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const articleIdSchema = z.string().uuid('articleId must be a valid UUID');

@Controller({ path: 'admin/articles', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AdminArticlesController {
  constructor(private readonly articlesService: AdminArticlesService) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listArticles(
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = listQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.articlesService.list(parsed.data);

    return createSuccessResponse(result.data, req.correlationId ?? '', {
      cursor: result.pagination.nextCursor,
      hasMore: result.pagination.hasMore,
      total: result.total,
    });
  }

  @Post(':articleId/transition')
  @HttpCode(HttpStatus.OK)
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async transition(
    @Param('articleId') articleId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    const idParsed = articleIdSchema.safeParse(articleId);
    if (!idParsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'articleId must be a valid UUID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = adminArticleTransitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.articlesService.forceTransition(
      idParsed.data,
      user.id,
      parsed.data,
      req.correlationId ?? '',
    );

    return createSuccessResponse(result, req.correlationId ?? '');
  }
}
