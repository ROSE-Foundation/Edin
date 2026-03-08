import { Controller, Get, Query, Sse, UseGuards, Logger, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { ActivityService } from './activity.service.js';
import { ActivitySseService } from './activity-sse.service.js';
import { activityFeedQuerySchema } from './dto/activity-feed-query.dto.js';
import { randomUUID } from 'crypto';

@Controller({ path: 'activity', version: '1' })
export class ActivityController {
  private readonly logger = new Logger(ActivityController.name);

  constructor(
    private readonly activityService: ActivityService,
    private readonly activitySseService: ActivitySseService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Activity'))
  async getFeed(@Query() rawQuery: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = activityFeedQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.activityService.getFeed(parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Sse('stream')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Activity'))
  stream(): Observable<MessageEvent> {
    this.logger.log('Activity SSE stream established', { module: 'activity' });
    return this.activitySseService.createStream();
  }

  @Get('public')
  async getPublicFeed(@Query() rawQuery: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = activityFeedQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.activityService.getPublicFeed(parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }
}
