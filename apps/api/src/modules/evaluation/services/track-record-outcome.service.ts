import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, TrackRecordOutcomeType } from '../../../../generated/prisma/client/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ActivityService } from '../../activity/activity.service.js';
import { NotificationService } from '../../notification/notification.service.js';
import type { ActivityEventType, NotificationType, NotificationCategory } from '@edin/shared';

// NO imports from evaluation.service.js, combined-evaluation.service.js,
// or any scoring/formula module — NP-NFR2 stream independence

/** Maps outcomeType string from threshold config to outcome details. */
const OUTCOME_DETAILS_MAP: Record<string, (thresholdName: string) => Record<string, string>> = {
  ROLE_ELIGIBILITY: (name) => ({ description: `Eligible for expanded roles based on ${name}` }),
  SALARY_TIER: (name) => ({
    description: `Qualified for salary tier advancement based on ${name}`,
  }),
  SERVICE_ACCESS: (name) => ({ description: `Access to priority services based on ${name}` }),
  INVITATION: (name) => ({ description: `Eligible to invite new contributors based on ${name}` }),
  CUSTOM: (name) => ({ description: `Custom outcome for ${name}` }),
};

interface ThresholdConfigSnapshot {
  outcomeType?: string;
  thresholdName?: string;
}

@Injectable()
export class TrackRecordOutcomeService {
  private readonly logger = new Logger(TrackRecordOutcomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Grants outcomes for a newly crossed milestone based on the threshold
   * config snapshot's outcomeType. Idempotent via unique constraint.
   */
  async grantOutcomesForMilestone(
    contributorId: string,
    milestone: {
      id: string;
      milestoneType: string;
      thresholdName: string;
      thresholdConfigSnapshot: unknown;
    },
  ) {
    const snapshot = milestone.thresholdConfigSnapshot as ThresholdConfigSnapshot;
    const outcomeType = snapshot?.outcomeType;

    if (!outcomeType || !OUTCOME_DETAILS_MAP[outcomeType]) {
      this.logger.warn('No valid outcomeType in threshold config snapshot', {
        module: 'evaluation',
        milestoneId: milestone.id,
        outcomeType,
      });
      return [];
    }

    const detailsFn = OUTCOME_DETAILS_MAP[outcomeType];
    const outcomeDetails = detailsFn(milestone.thresholdName);

    try {
      const outcome = await this.prisma.trackRecordOutcome.create({
        data: {
          milestoneId: milestone.id,
          contributorId,
          outcomeType: outcomeType as TrackRecordOutcomeType,
          outcomeDetails: outcomeDetails as Prisma.InputJsonValue,
          metadata: {
            milestoneType: milestone.milestoneType,
            thresholdName: milestone.thresholdName,
            grantedBy: 'system',
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log('Outcome granted', {
        module: 'evaluation',
        contributorId,
        outcomeId: outcome.id,
        outcomeType,
        milestoneId: milestone.id,
      });

      await this.emitOutcomeEvents(contributorId, outcome.id, milestone.id, outcomeType);

      return [outcome];
    } catch (error: unknown) {
      // P2002 = unique constraint violation — outcome already exists for this milestone+type
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        this.logger.debug('Outcome already exists for milestone (idempotent skip)', {
          module: 'evaluation',
          milestoneId: milestone.id,
          outcomeType,
        });
        return [];
      }
      throw error;
    }
  }

  /**
   * Emits activity event and queues notification for a newly granted outcome.
   */
  private async emitOutcomeEvents(
    contributorId: string,
    outcomeId: string,
    milestoneId: string,
    outcomeType: string,
  ): Promise<void> {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { domain: true },
    });

    const domain = contributor?.domain ?? 'Technology';

    try {
      await this.activityService.createActivityEvent({
        eventType: 'TRACK_RECORD_OUTCOME_GRANTED' as ActivityEventType,
        title: `Outcome unlocked: ${outcomeType}`,
        description: `A track record outcome of type ${outcomeType} has been granted`,
        contributorId,
        domain: domain as never,
        entityId: outcomeId,
        metadata: { outcomeType, milestoneId },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create outcome activity event', {
        module: 'evaluation',
        outcomeId,
        contributorId,
        error: message,
      });
    }

    try {
      await this.notificationService.enqueueNotification({
        contributorId,
        type: 'TRACK_RECORD_OUTCOME' as NotificationType as never,
        title: `New outcome unlocked: ${outcomeType}`,
        description: `Your track record milestone has unlocked a ${outcomeType} outcome.`,
        entityId: outcomeId,
        category: 'track-record' as NotificationCategory as never,
        correlationId: randomUUID(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to enqueue outcome notification', {
        module: 'evaluation',
        outcomeId,
        contributorId,
        error: message,
      });
    }
  }
}
