import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { PrizeAwardService } from './prize-award.service.js';

@Controller({ path: 'prize-awards', version: '1' })
export class PrizeAwardController {
  private readonly logger = new Logger(PrizeAwardController.name);

  constructor(private readonly prizeAwardService: PrizeAwardService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'PrizeAward'))
  async findMyAwards(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    this.logger.log('Fetching prize awards for current user', {
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const awards = await this.prizeAwardService.findByContributor(user.id);

    return createSuccessResponse(
      awards.map((a) => ({
        id: a.id,
        prizeCategoryId: a.prizeCategoryId,
        prizeCategoryName: a.prizeCategory.name,
        significanceLevel: a.significanceLevel,
        channelId: a.channelId,
        channelName: a.channel.name,
        chathamHouseLabel: a.chathamHouseLabel,
        narrative: a.narrative,
        awardedAt: a.awardedAt.toISOString(),
        metadata: a.metadata,
      })),
      req.correlationId || 'unknown',
    );
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'PrizeAward'))
  async getAdminOverview(@Req() req: Request) {
    this.logger.log('Fetching admin prize overview', {
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const overview = await this.prizeAwardService.getAdminOverview();

    return createSuccessResponse(overview, req.correlationId || 'unknown');
  }

  @Get('contributor/:contributorId')
  async findPublicAwards(
    @Param('contributorId', new ParseUUIDPipe()) contributorId: string,
    @Req() req: Request,
  ) {
    // Verify contributor exists before returning awards
    const exists = await this.prizeAwardService.contributorExists(contributorId);
    if (!exists) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const awards = await this.prizeAwardService.findPublicByContributor(contributorId);

    return createSuccessResponse(
      awards.map((a) => ({
        id: a.id,
        prizeCategoryName: a.prizeCategory.name,
        significanceLevel: a.significanceLevel,
        channelName: a.channel.name,
        chathamHouseLabel: a.chathamHouseLabel,
        narrative: a.narrative,
        awardedAt: a.awardedAt.toISOString(),
      })),
      req.correlationId || 'unknown',
    );
  }
}
