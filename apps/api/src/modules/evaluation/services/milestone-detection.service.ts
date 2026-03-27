import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../generated/prisma/client/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ActivityService } from '../../activity/activity.service.js';
import { NotificationService } from '../../notification/notification.service.js';
import { TrackRecordOutcomeService } from './track-record-outcome.service.js';
import type { ActivityEventType, NotificationType, NotificationCategory } from '@edin/shared';

// NO imports from evaluation.service.js, combined-evaluation.service.js,
// or any scoring/formula module — NP-NFR2 stream independence

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

@Injectable()
export class MilestoneDetectionService {
  private readonly logger = new Logger(MilestoneDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService,
    private readonly outcomeService: TrackRecordOutcomeService,
  ) {}

  /**
   * Detects and records milestone crossings for a contributor based on their
   * track record evaluation metrics. Idempotent — skips already-crossed milestones.
   */
  async detectMilestones(
    contributorId: string,
    evaluation: {
      id: string;
      consistencyScore: Prisma.Decimal | number;
      engagementDurationMonths: number;
      contributionCount: number;
      domainBreadth: number;
      activeWeeksRatio: Prisma.Decimal | number;
    },
  ) {
    this.logger.log('Detecting milestones', { module: 'evaluation', contributorId });

    // 1. Fetch all active threshold configs
    const thresholdConfigs = await this.prisma.trackRecordThresholdConfig.findMany({
      where: { isActive: true },
    });

    if (thresholdConfigs.length === 0) {
      this.logger.debug('No active threshold configs found', { module: 'evaluation' });
      return [];
    }

    // 2. Fetch existing milestones for this contributor
    const existingMilestones = await this.prisma.trackRecordMilestone.findMany({
      where: { contributorId },
      select: { milestoneType: true, thresholdName: true },
    });

    // 3. Build a Set of already-crossed keys
    const crossedKeys = new Set(
      existingMilestones.map((m) => `${m.milestoneType}::${m.thresholdName}`),
    );

    // 4. Evaluate each threshold and create milestones for new crossings
    const newMilestones = [];

    for (const config of thresholdConfigs) {
      const key = `${config.milestoneType}::${config.thresholdName}`;

      // Skip already-crossed milestones
      if (crossedKeys.has(key)) {
        continue;
      }

      // Evaluate all conditions — validate structure before evaluating
      const rules = config.thresholdRules as unknown as ThresholdRules;
      if (!Array.isArray(rules?.conditions)) {
        this.logger.error('Invalid threshold config: missing conditions array', {
          module: 'evaluation',
          configId: config.id,
          thresholdName: config.thresholdName,
        });
        continue;
      }
      const allConditionsMet = rules.conditions.every((condition) =>
        this.evaluateCondition(evaluation, condition),
      );

      if (!allConditionsMet) {
        continue;
      }

      // Create milestone record — catch unique constraint violation for idempotency
      try {
        const milestone = await this.prisma.trackRecordMilestone.create({
          data: {
            contributorId,
            milestoneType: config.milestoneType,
            thresholdName: config.thresholdName,
            thresholdConfigSnapshot: {
              id: config.id,
              milestoneType: config.milestoneType,
              thresholdName: config.thresholdName,
              thresholdRules: config.thresholdRules,
              outcomeType: config.outcomeType,
              frozenAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });

        newMilestones.push(milestone);

        this.logger.log('Milestone crossed', {
          module: 'evaluation',
          contributorId,
          milestoneType: config.milestoneType,
          thresholdName: config.thresholdName,
          milestoneId: milestone.id,
        });

        // Emit activity event and queue notification
        await this.emitMilestoneEvents(contributorId, milestone.id, config);

        // Grant outcomes for the newly crossed milestone
        try {
          await this.outcomeService.grantOutcomesForMilestone(contributorId, milestone);
        } catch (outcomeError: unknown) {
          const msg = outcomeError instanceof Error ? outcomeError.message : String(outcomeError);
          this.logger.error('Failed to grant outcomes for milestone', {
            module: 'evaluation',
            milestoneId: milestone.id,
            contributorId,
            error: msg,
          });
        }
      } catch (error: unknown) {
        // P2002 = unique constraint violation — another process already created this milestone
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code: string }).code === 'P2002'
        ) {
          this.logger.debug('Milestone already exists (concurrent creation)', {
            module: 'evaluation',
            contributorId,
            thresholdName: config.thresholdName,
          });
          continue;
        }
        throw error;
      }
    }

    this.logger.log('Milestone detection complete', {
      module: 'evaluation',
      contributorId,
      newMilestonesCount: newMilestones.length,
    });

    return newMilestones;
  }

  /**
   * Evaluates a single threshold condition against the evaluation metrics.
   */
  private evaluateCondition(
    evaluation: {
      consistencyScore: Prisma.Decimal | number;
      engagementDurationMonths: number;
      contributionCount: number;
      domainBreadth: number;
      activeWeeksRatio: Prisma.Decimal | number;
    },
    condition: ThresholdCondition,
  ): boolean {
    const propName = FIELD_MAP[condition.field];
    if (!propName) {
      this.logger.warn('Unknown threshold condition field', {
        module: 'evaluation',
        field: condition.field,
      });
      return false;
    }

    const rawValue = (evaluation as Record<string, unknown>)[propName];
    const metricValue =
      typeof rawValue === 'object' && rawValue !== null
        ? Number((rawValue as { toString(): string }).toString())
        : Number(rawValue);

    switch (condition.operator) {
      case '>=':
        return metricValue >= condition.value;
      case '>':
        return metricValue > condition.value;
      case '<=':
        return metricValue <= condition.value;
      case '<':
        return metricValue < condition.value;
      case '==':
        return metricValue === condition.value;
      default:
        this.logger.warn('Unknown threshold condition operator', {
          module: 'evaluation',
          operator: condition.operator,
        });
        return false;
    }
  }

  /**
   * Emits activity event and queues notification for a newly crossed milestone.
   */
  private async emitMilestoneEvents(
    contributorId: string,
    milestoneId: string,
    config: { milestoneType: string; thresholdName: string },
  ): Promise<void> {
    // Look up contributor domain for activity event
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { domain: true },
    });

    const domain = contributor?.domain ?? 'Technology';

    try {
      await this.activityService.createActivityEvent({
        eventType: 'TRACK_RECORD_MILESTONE_CROSSED' as ActivityEventType,
        title: `Milestone achieved: ${config.thresholdName}`,
        description: `Contributor reached the "${config.thresholdName}" milestone`,
        contributorId,
        domain: domain as never,
        entityId: milestoneId,
        metadata: {
          milestoneType: config.milestoneType,
          thresholdName: config.thresholdName,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create milestone activity event', {
        module: 'evaluation',
        milestoneId,
        contributorId,
        milestoneType: config.milestoneType,
        thresholdName: config.thresholdName,
        error: message,
      });
    }

    try {
      await this.notificationService.enqueueNotification({
        contributorId,
        type: 'TRACK_RECORD_MILESTONE' as NotificationType as never,
        title: `You reached a milestone: ${config.thresholdName}`,
        description: `Congratulations! Your sustained engagement earned the "${config.thresholdName}" milestone.`,
        entityId: milestoneId,
        category: 'track-record' as NotificationCategory as never,
        correlationId: randomUUID(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to enqueue milestone notification', {
        module: 'evaluation',
        milestoneId,
        contributorId,
        milestoneType: config.milestoneType,
        thresholdName: config.thresholdName,
        error: message,
      });
    }
  }
}
