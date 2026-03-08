import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Sse,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { NotificationService } from './notification.service.js';
import { NotificationSseService } from './notification-sse.service.js';
import { notificationQueryDto, markAllReadQueryDto } from './dto/notification-query.dto.js';
import { randomUUID } from 'crypto';

@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationSseService: NotificationSseService,
  ) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Read, 'Notification'))
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = notificationQueryDto.safeParse(rawQuery);

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

    const result = await this.notificationService.getNotifications(user.id, parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Patch(':id/read')
  @CheckAbility((ability) => ability.can(Action.Update, 'Notification'))
  async markAsRead(@CurrentUser() user: CurrentUserPayload, @Param('id') notificationId: string) {
    const correlationId = randomUUID();
    const result = await this.notificationService.markAsRead(notificationId, user.id);

    if (!result) {
      throw new DomainException(
        ERROR_CODES.NOTIFICATION_NOT_FOUND,
        'Notification not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return createSuccessResponse(result, correlationId);
  }

  @Patch('read-all')
  @CheckAbility((ability) => ability.can(Action.Update, 'Notification'))
  async markAllAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = markAllReadQueryDto.safeParse(rawQuery);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.notificationService.markAllAsRead(user.id, parsed.data.category);

    return createSuccessResponse(result, correlationId);
  }

  @Get('unread-counts')
  @CheckAbility((ability) => ability.can(Action.Read, 'Notification'))
  async getUnreadCounts(@CurrentUser() user: CurrentUserPayload) {
    const correlationId = randomUUID();
    const counts = await this.notificationService.getUnreadCounts(user.id);

    return createSuccessResponse(counts, correlationId);
  }

  @Sse('stream')
  @CheckAbility((ability) => ability.can(Action.Read, 'Notification'))
  stream(@CurrentUser() user: CurrentUserPayload): Observable<MessageEvent> {
    this.logger.log('Notification SSE stream established', {
      module: 'notification',
      contributorId: user.id,
    });
    return this.notificationSseService.createStream(user.id);
  }
}
