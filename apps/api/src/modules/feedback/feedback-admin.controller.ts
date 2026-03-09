import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import {
  ERROR_CODES,
  reassignFeedbackSchema,
  feedbackMonitoringQuerySchema,
  slaUpdateSchema,
} from '@edin/shared';
import { FeedbackService } from './feedback.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { adminAssignDto } from './dto/feedback-query.dto.js';
import { randomUUID } from 'crypto';

@Controller({ path: 'admin/feedback', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class FeedbackAdminController {
  private readonly logger = new Logger(FeedbackAdminController.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post('assign')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async adminAssign(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = adminAssignDto.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.feedbackService.adminAssignReviewer(
      parsed.data.contributionId,
      parsed.data.reviewerId,
      user.id,
      correlationId,
    );

    this.logger.log('Admin assigned peer reviewer', {
      module: 'feedback',
      contributionId: parsed.data.contributionId,
      reviewerId: parsed.data.reviewerId,
      adminId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }

  @Get('metrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async getMetrics() {
    const correlationId = randomUUID();
    const slaHours = await this.settingsService.getSettingValue<number>('feedback.sla.hours', 48);
    const metrics = await this.feedbackService.getFeedbackMetrics(slaHours);

    return createSuccessResponse({ metrics, slaHours }, correlationId);
  }

  @Get('overdue')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async getOverdueReviews(@Query() query: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = feedbackMonitoringQuerySchema.safeParse(query);

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

    const slaHours = await this.settingsService.getSettingValue<number>('feedback.sla.hours', 48);
    const result = await this.feedbackService.getOverdueReviews(slaHours, parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Post(':id/reassign')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async reassignFeedback(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = reassignFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.feedbackService.reassignFeedback(
      id,
      parsed.data.newReviewerId,
      parsed.data.reason,
      user.id,
      correlationId,
    );

    this.logger.log('Feedback reassigned', {
      module: 'feedback',
      feedbackId: id,
      newReviewerId: parsed.data.newReviewerId,
      adminId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }

  @Get('settings/sla')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async getSla() {
    const correlationId = randomUUID();
    const hours = await this.settingsService.getSettingValue<number>('feedback.sla.hours', 48);
    return createSuccessResponse({ hours }, correlationId);
  }

  @Put('settings/sla')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async updateSla(@CurrentUser() user: CurrentUserPayload, @Body() body: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = slaUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const oldHours = await this.settingsService.getSettingValue<number>('feedback.sla.hours', 48);
    await this.settingsService.updateSetting(
      'feedback.sla.hours',
      parsed.data.hours,
      user.id,
      correlationId,
    );

    this.logger.log('Feedback SLA updated', {
      module: 'feedback',
      oldHours,
      newHours: parsed.data.hours,
      adminId: user.id,
      correlationId,
    });

    return createSuccessResponse({ hours: parsed.data.hours }, correlationId);
  }

  @Get(':id/eligible-reviewers')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async getEligibleReviewers(@Param('id') id: string) {
    const correlationId = randomUUID();
    const result = await this.feedbackService.getEligibleReviewers(id);
    return createSuccessResponse(result, correlationId);
  }
}
