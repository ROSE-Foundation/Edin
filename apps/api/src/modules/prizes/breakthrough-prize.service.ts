import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../generated/prisma/client/client.js';
import type { ContributorDomain } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type {
  HighSignificanceDetectedEvent,
  PrizeAwardedEvent,
  PrizeAwardedMetadata,
} from '@edin/shared';

const SIGNIFICANCE_TIER_EXCEPTIONAL = 3;
const BREAKTHROUGH_PRIZE_CATEGORY_NAME = 'Breakthrough';

@Injectable()
export class BreakthroughPrizeService {
  private readonly logger = new Logger(BreakthroughPrizeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
    private readonly chathamHouseAttributionService: ChathamHouseAttributionService,
  ) {}

  @OnEvent('prize.event.high_significance_detected')
  async handleHighSignificanceDetected(event: HighSignificanceDetectedEvent): Promise<void> {
    const { correlationId } = event;
    const { contributionId, contributorId, compositeScore, domain, channelId } = event.payload;

    try {
      // 1. Load Breakthrough prize category
      const prizeCategory = await this.prisma.prizeCategory.findFirst({
        where: { name: BREAKTHROUGH_PRIZE_CATEGORY_NAME, isActive: true },
      });

      if (!prizeCategory) {
        this.logger.warn('Breakthrough prize category not found or inactive', {
          module: 'prizes',
          correlationId,
        });
        return;
      }

      // 2. Idempotency check
      const existingAward = await this.prisma.prizeAward.findFirst({
        where: {
          contributionId,
          prizeCategoryId: prizeCategory.id,
        },
      });

      if (existingAward) {
        this.logger.debug('Breakthrough prize already awarded for this contribution, skipping', {
          module: 'prizes',
          contributionId,
          prizeAwardId: existingAward.id,
          correlationId,
        });
        return;
      }

      // 3. Frequency cap check
      const frequencyCapExceeded = await this.checkFrequencyCap(
        contributorId,
        prizeCategory.id,
        prizeCategory.scalingConfig,
        correlationId,
      );
      if (frequencyCapExceeded) {
        return;
      }

      // 4. Extract threshold config
      const thresholdConfig = prizeCategory.thresholdConfig as Record<
        string,
        Record<string, unknown>
      >;
      const breakthroughConfig = thresholdConfig?.breakthrough ?? {};
      const percentileThreshold = Number(breakthroughConfig.percentile_threshold ?? 99);
      const minComplexityMultiplier = Number(breakthroughConfig.min_complexity_multiplier ?? 1.5);
      const baselineWindowDays = Number(breakthroughConfig.baseline_window_days ?? 90);
      const minHistoricalContributions = Number(
        breakthroughConfig.min_historical_contributions ?? 10,
      );

      // 5. Check baseline sample size
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - baselineWindowDays);

      const baselineResult = await this.prisma.$queryRaw<
        Array<{ percentile_value: number | null; sample_size: bigint }>
      >(
        Prisma.sql`
          SELECT
            percentile_cont(${percentileThreshold / 100}::float) WITHIN GROUP (ORDER BY e.composite_score::float) AS percentile_value,
            COUNT(*)::bigint AS sample_size
          FROM evaluation.evaluations e
          JOIN core.contributors c ON c.id = e.contributor_id
          WHERE e.status = 'COMPLETED'
            AND e.completed_at >= ${windowStart}
            AND c.domain = ${domain}::"ContributorDomain"
            AND e.composite_score IS NOT NULL
        `,
      );

      const row = baselineResult[0];
      const sampleSize = row ? Number(row.sample_size) : 0;

      if (sampleSize < minHistoricalContributions) {
        this.logger.log('Insufficient baseline data for breakthrough detection, skipping', {
          module: 'prizes',
          contributionId,
          contributorId,
          domain,
          sampleSize,
          minHistoricalContributions,
          correlationId,
        });
        return;
      }

      // 6. Check if composite score exceeds the configured percentile threshold
      if (row?.percentile_value == null || compositeScore <= Number(row.percentile_value)) {
        this.logger.debug('Composite score does not exceed breakthrough threshold', {
          module: 'prizes',
          contributionId,
          compositeScore,
          percentileThreshold,
          percentileValue: row?.percentile_value ?? null,
          correlationId,
        });
        return;
      }
      const percentileValue = Number(row.percentile_value);

      // 7. Check complexity multiplier
      const evalResult = await this.prisma.$queryRaw<
        Array<{ complexity_multiplier: number | null }>
      >(
        Prisma.sql`
          SELECT complexity_multiplier::float
          FROM evaluation.evaluations
          WHERE contribution_id = ${contributionId}::uuid
            AND status = 'COMPLETED'
            AND composite_score IS NOT NULL
          ORDER BY completed_at DESC
          LIMIT 1
        `,
      );

      const complexityMultiplier =
        evalResult[0]?.complexity_multiplier != null
          ? Number(evalResult[0].complexity_multiplier)
          : 1.0;

      if (complexityMultiplier < minComplexityMultiplier) {
        this.logger.debug('Complexity multiplier below breakthrough threshold', {
          module: 'prizes',
          contributionId,
          complexityMultiplier,
          minComplexityMultiplier,
          correlationId,
        });
        return;
      }

      // 8. Significance level is always exceptional (3) for breakthrough
      const significanceLevel = SIGNIFICANCE_TIER_EXCEPTIONAL;

      // 9. Generate Chatham House label
      const chathamHouseLabel = await this.generateChathamHouseLabel(contributorId);

      // 10. Generate narrative
      const narrative = `Breakthrough contribution in ${domain}: composite score ${compositeScore} exceeded the ${percentileThreshold}th percentile threshold of ${Math.round(percentileValue * 100) / 100} with complexity multiplier ${complexityMultiplier}`;

      // 11. Resolve channel
      const resolvedChannelId = channelId ?? (await this.resolveChannelId(domain));
      if (!resolvedChannelId) {
        this.logger.warn('No channel found for breakthrough prize award', {
          module: 'prizes',
          contributionId,
          domain,
          correlationId,
        });
        return;
      }

      // 12. Look up contributor's primary domain
      const contributor = await this.prisma.contributor.findUnique({
        where: { id: contributorId },
        select: { domain: true },
      });
      const contributorDomain = (contributor?.domain ?? domain) as ContributorDomain;

      // 13. Create PrizeAward record
      const prizeAward = await this.prisma.prizeAward.create({
        data: {
          prizeCategoryId: prizeCategory.id,
          recipientContributorId: contributorId,
          contributionId,
          significanceLevel,
          channelId: resolvedChannelId,
          chathamHouseLabel,
          narrative,
          metadata: {
            isBreakthrough: true,
            compositeScore,
            percentileThreshold,
            percentileValue: Math.round(percentileValue * 100) / 100,
            complexityMultiplier,
            domain,
            sampleSize,
            correlationId,
          } as Prisma.InputJsonValue,
        },
      });

      // 14. Emit PRIZE_AWARDED activity event
      const activityMetadata: PrizeAwardedMetadata = {
        prizeCategoryId: prizeCategory.id,
        prizeCategoryName: prizeCategory.name,
        prizeAwardId: prizeAward.id,
        significanceLevel,
        channelId: resolvedChannelId,
        chathamHouseLabel,
        contributionId,
      };

      await this.activityService.createActivityEvent({
        eventType: 'PRIZE_AWARDED',
        title: `Breakthrough Prize Awarded (Exceptional)`,
        description: narrative,
        contributorId,
        domain: contributorDomain,
        entityId: prizeAward.id,
        metadata: { ...activityMetadata, isBreakthrough: true },
      });

      // 15. Emit downstream event for notification consumption
      const prizeAwardedEvent: PrizeAwardedEvent = {
        eventType: 'prize.event.awarded',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: contributorId,
        payload: {
          prizeAwardId: prizeAward.id,
          prizeCategoryId: prizeCategory.id,
          prizeCategoryName: prizeCategory.name,
          recipientContributorId: contributorId,
          contributionId,
          significanceLevel,
          channelId: resolvedChannelId,
          chathamHouseLabel,
          narrative,
        },
      };
      this.eventEmitter.emit('prize.event.awarded', prizeAwardedEvent);

      this.logger.log('Breakthrough Prize awarded', {
        module: 'prizes',
        prizeAwardId: prizeAward.id,
        prizeCategoryId: prizeCategory.id,
        contributorId,
        contributionId,
        significanceLevel,
        compositeScore,
        percentileThreshold,
        percentileValue,
        complexityMultiplier,
        domain,
        correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process breakthrough prize detection', {
        module: 'prizes',
        contributionId,
        contributorId,
        correlationId,
        error: message,
      });
    }
  }

  private async generateChathamHouseLabel(contributorId: string): Promise<string> {
    return this.chathamHouseAttributionService.generateLabel(contributorId);
  }

  private async resolveChannelId(domain: string): Promise<string | null> {
    const channel = await this.prisma.channel.findFirst({
      where: { type: 'DOMAIN', name: domain, isActive: true },
      select: { id: true },
    });
    return channel?.id ?? null;
  }

  private async checkFrequencyCap(
    contributorId: string,
    prizeCategoryId: string,
    scalingConfig: unknown,
    correlationId: string,
  ): Promise<boolean> {
    const config = scalingConfig as Record<string, Record<string, number>> | null;
    const frequencyCap = config?.frequency_cap;

    if (!frequencyCap) {
      return false;
    }

    const maxAwards = frequencyCap.max_awards_per_contributor_per_period;
    const periodDays = frequencyCap.period_days;

    if (!maxAwards || !periodDays) {
      return false;
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const recentAwardCount = await this.prisma.prizeAward.count({
      where: {
        recipientContributorId: contributorId,
        prizeCategoryId,
        awardedAt: { gte: periodStart },
      },
    });

    if (recentAwardCount >= maxAwards) {
      this.logger.log('Frequency cap exceeded for breakthrough prize, skipping', {
        module: 'prizes',
        contributorId,
        prizeCategoryId,
        recentAwardCount,
        maxAwards,
        periodDays,
        correlationId,
      });
      return true;
    }

    return false;
  }
}
