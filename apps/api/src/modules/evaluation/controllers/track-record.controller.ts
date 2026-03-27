import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

// NO imports from evaluation.service.js or combined-evaluation.service.js — NP-NFR2

interface ThresholdCondition {
  field: string;
  operator: string;
  value: number;
}

interface ThresholdRules {
  conditions: ThresholdCondition[];
}

/** Maps threshold_rules field names to TrackRecordEvaluation property names */
const FIELD_MAP: Record<string, string> = {
  engagement_duration_months: 'engagementDurationMonths',
  active_weeks_ratio: 'activeWeeksRatio',
  domain_breadth: 'domainBreadth',
  contribution_count: 'contributionCount',
  consistency_score: 'consistencyScore',
};

@Controller({ path: 'track-record', version: '1' })
@UseGuards(JwtAuthGuard)
export class TrackRecordController {
  private readonly logger = new Logger(TrackRecordController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMyTrackRecord(@CurrentUser() user: CurrentUserPayload) {
    const correlationId = randomUUID();

    // 1. Fetch milestones with outcomes
    const milestones = await this.prisma.trackRecordMilestone.findMany({
      where: { contributorId: user.id },
      include: { outcomes: true },
      orderBy: { crossedAt: 'desc' },
    });

    // 2. Fetch latest track record evaluation
    const latestEvaluation = await this.prisma.trackRecordEvaluation.findFirst({
      where: { contributorId: user.id },
      orderBy: { computedAt: 'desc' },
    });

    // 3. Fetch all active threshold configs
    const thresholdConfigs = await this.prisma.trackRecordThresholdConfig.findMany({
      where: { isActive: true },
    });

    // 4. Compute progress indicators (discrete steps per NP-NFR1)
    const crossedKeys = new Set(milestones.map((m) => `${m.milestoneType}::${m.thresholdName}`));

    const progress = thresholdConfigs.map((config) => {
      const key = `${config.milestoneType}::${config.thresholdName}`;
      const isCrossed = crossedKeys.has(key);
      const rules = config.thresholdRules as unknown as ThresholdRules;
      const conditions = Array.isArray(rules?.conditions) ? rules.conditions : [];

      let conditionsMet = 0;
      if (!isCrossed && latestEvaluation) {
        for (const condition of conditions) {
          const propName = FIELD_MAP[condition.field];
          if (!propName) continue;
          const rawValue = (latestEvaluation as Record<string, unknown>)[propName];
          const metricValue =
            typeof rawValue === 'object' && rawValue !== null
              ? Number((rawValue as { toString(): string }).toString())
              : Number(rawValue);
          const met = this.evaluateOperator(metricValue, condition.operator, condition.value);
          if (met) conditionsMet++;
        }
      }

      return {
        milestoneType: config.milestoneType,
        thresholdName: config.thresholdName,
        outcomeType: config.outcomeType,
        isCrossed,
        totalConditions: conditions.length,
        conditionsMet: isCrossed ? conditions.length : conditionsMet,
      };
    });

    // 5. Collect active outcomes
    const outcomes = milestones.flatMap((m) =>
      m.outcomes.map((o) => ({
        id: o.id,
        outcomeType: o.outcomeType,
        outcomeDetails: o.outcomeDetails,
        status: o.status,
        grantedAt: o.grantedAt.toISOString(),
        expiresAt: o.expiresAt?.toISOString() ?? null,
        milestoneThresholdName: m.thresholdName,
      })),
    );

    const data = {
      milestones: milestones.map((m) => ({
        id: m.id,
        milestoneType: m.milestoneType,
        thresholdName: m.thresholdName,
        crossedAt: m.crossedAt.toISOString(),
      })),
      outcomes,
      progress,
      latestEvaluation: latestEvaluation
        ? {
            consistencyScore: Number(latestEvaluation.consistencyScore),
            engagementDurationMonths: latestEvaluation.engagementDurationMonths,
            contributionCount: latestEvaluation.contributionCount,
            domainBreadth: latestEvaluation.domainBreadth,
            activeWeeksRatio: Number(latestEvaluation.activeWeeksRatio),
            computedAt: latestEvaluation.computedAt.toISOString(),
          }
        : null,
    };

    this.logger.debug('Track record retrieved', {
      module: 'evaluation',
      userId: user.id,
      milestoneCount: milestones.length,
      outcomeCount: outcomes.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  private evaluateOperator(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>=':
        return value >= threshold;
      case '>':
        return value > threshold;
      case '<=':
        return value <= threshold;
      case '<':
        return value < threshold;
      case '==':
        return value === threshold;
      default:
        return false;
    }
  }
}
