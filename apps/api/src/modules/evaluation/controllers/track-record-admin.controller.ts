import { Controller, Get, Patch, Param, Body, UseGuards, Logger, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../../common/guards/ability.guard.js';
import { CheckAbility } from '../../../common/decorators/check-ability.decorator.js';
import { Action } from '../../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

@Controller({ path: 'admin/track-record', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class TrackRecordAdminController {
  private readonly logger = new Logger(TrackRecordAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get('overview')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getOverview() {
    const correlationId = randomUUID();

    // Milestone distribution
    const milestoneDistribution = await this.prisma.trackRecordMilestone.groupBy({
      by: ['milestoneType'],
      _count: { id: true },
    });

    // Outcome distribution
    const outcomeDistribution = await this.prisma.trackRecordOutcome.groupBy({
      by: ['outcomeType'],
      _count: { id: true },
    });

    // Threshold configs
    const thresholdConfigs = await this.prisma.trackRecordThresholdConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const data = {
      milestoneDistribution: milestoneDistribution.map((m) => ({
        milestoneType: m.milestoneType,
        count: m._count.id,
      })),
      outcomeDistribution: outcomeDistribution.map((o) => ({
        outcomeType: o.outcomeType,
        count: o._count.id,
      })),
      thresholdConfigs: thresholdConfigs.map((c) => ({
        id: c.id,
        milestoneType: c.milestoneType,
        thresholdName: c.thresholdName,
        thresholdRules: c.thresholdRules,
        outcomeType: c.outcomeType,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      })),
    };

    this.logger.debug('Track record admin overview served', {
      module: 'evaluation',
      milestoneTypes: milestoneDistribution.length,
      outcomeTypes: outcomeDistribution.length,
      configCount: thresholdConfigs.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Patch('thresholds/:id')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async updateThreshold(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean; outcomeType?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();

    const config = await this.prisma.trackRecordThresholdConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new DomainException(
        ERROR_CODES.TRACK_RECORD_THRESHOLD_NOT_FOUND,
        'Track record threshold configuration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const VALID_OUTCOME_TYPES = [
      'ROLE_ELIGIBILITY',
      'SALARY_TIER',
      'SERVICE_ACCESS',
      'INVITATION',
      'CUSTOM',
    ];

    if (body.outcomeType !== undefined && !VALID_OUTCOME_TYPES.includes(body.outcomeType)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `outcomeType must be one of: ${VALID_OUTCOME_TYPES.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.outcomeType !== undefined) updateData.outcomeType = body.outcomeType;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.trackRecordThresholdConfig.update({
        where: { id },
        data: updateData,
      });

      await this.auditService.log(
        {
          actorId: user.id,
          action: 'TRACK_RECORD_THRESHOLD_UPDATED',
          entityType: 'TrackRecordThresholdConfig',
          entityId: id,
          correlationId,
          details: {
            thresholdName: config.thresholdName,
            changes: updateData,
            previousValues: {
              isActive: config.isActive,
              outcomeType: config.outcomeType,
            },
          },
        },
        tx,
      );

      return result;
    });

    this.logger.log('Track record threshold updated', {
      module: 'evaluation',
      thresholdId: id,
      thresholdName: config.thresholdName,
      changes: updateData,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(
      {
        id: updated.id,
        milestoneType: updated.milestoneType,
        thresholdName: updated.thresholdName,
        thresholdRules: updated.thresholdRules,
        outcomeType: updated.outcomeType,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
      },
      correlationId,
    );
  }
}
