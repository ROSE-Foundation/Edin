import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  TemporalHorizon,
  ScoreTrend,
  TemporalScoreAggregateDto,
  RewardScoreCalculatedEvent,
  RewardScoreAggregatedEvent,
} from '@edin/shared';

@Injectable()
export class TemporalAggregationService {
  private readonly logger = new Logger(TemporalAggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle score calculated event — create/update SESSION aggregate.
   */
  @OnEvent('reward.score.calculated')
  async handleScoreCalculated(event: RewardScoreCalculatedEvent): Promise<void> {
    try {
      await this.aggregateForHorizon(event.payload.contributorId, 'SESSION', event.correlationId);
    } catch (error) {
      this.logger.error('Failed to aggregate session score', {
        module: 'reward',
        contributorId: event.payload.contributorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Aggregate scores for a contributor across a specific temporal horizon.
   * Idempotent — re-running produces the same result.
   */
  async aggregateForHorizon(
    contributorId: string,
    horizon: TemporalHorizon,
    correlationId: string,
  ): Promise<TemporalScoreAggregateDto> {
    const { periodStart, periodEnd } = this.getPeriodBounds(horizon, new Date());

    // Get all scores in this period
    const scores = await this.prisma.contributionScore.findMany({
      where: {
        contributorId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      select: { compositeScore: true },
    });

    const contributionCount = scores.length;
    const aggregatedScore =
      contributionCount > 0
        ? Math.round(
            (scores.reduce((sum, s) => sum + Number(s.compositeScore), 0) / contributionCount) *
              100,
          ) / 100
        : 0;

    // Determine trend by comparing to previous period
    const trend = await this.calculateTrend(contributorId, horizon, aggregatedScore, periodStart);

    // Upsert — idempotent
    const aggregate = await this.prisma.temporalScoreAggregate.upsert({
      where: {
        contributorId_horizon_periodStart: {
          contributorId,
          horizon: horizon as never,
          periodStart,
        },
      },
      create: {
        contributorId,
        horizon: horizon as never,
        periodStart,
        periodEnd,
        aggregatedScore,
        contributionCount,
        trend: trend as never,
        computedAt: new Date(),
      },
      update: {
        aggregatedScore,
        contributionCount,
        trend: trend as never,
        computedAt: new Date(),
      },
    });

    this.logger.log('Temporal score aggregated', {
      module: 'reward',
      contributorId,
      horizon,
      aggregatedScore,
      contributionCount,
      trend,
      correlationId,
    });

    // Emit aggregated event
    const aggregatedEvent: RewardScoreAggregatedEvent = {
      eventType: 'reward.score.aggregated',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        contributorId,
        horizon,
        aggregatedScore,
        contributionCount,
        trend,
      },
    };

    this.eventEmitter.emit('reward.score.aggregated', aggregatedEvent);

    return this.mapAggregateToDto(aggregate);
  }

  /**
   * Aggregate all contributors for a given horizon. Used by scheduled jobs.
   */
  async aggregateAllContributors(horizon: TemporalHorizon, correlationId: string): Promise<number> {
    const { periodStart, periodEnd } = this.getPeriodBounds(horizon, new Date());

    // Find all contributors with scores in this period
    const contributors = await this.prisma.contributionScore.findMany({
      where: { createdAt: { gte: periodStart, lt: periodEnd } },
      select: { contributorId: true },
      distinct: ['contributorId'],
    });

    // Process in parallel batches of 10 for bounded concurrency
    const batchSize = 10;
    let aggregatedCount = 0;
    for (let i = 0; i < contributors.length; i += batchSize) {
      const batch = contributors.slice(i, i + batchSize);
      await Promise.all(
        batch.map(({ contributorId }) =>
          this.aggregateForHorizon(contributorId, horizon, correlationId),
        ),
      );
      aggregatedCount += batch.length;
    }

    this.logger.log('Bulk temporal aggregation completed', {
      module: 'reward',
      horizon,
      contributorsProcessed: aggregatedCount,
      correlationId,
    });

    return aggregatedCount;
  }

  /**
   * Get all temporal aggregates for a contributor (latest per horizon).
   */
  async getContributorAggregates(contributorId: string): Promise<TemporalScoreAggregateDto[]> {
    // Fetch all aggregates ordered by periodStart desc, then deduplicate per horizon
    const allAggregates = await this.prisma.temporalScoreAggregate.findMany({
      where: { contributorId },
      orderBy: { periodStart: 'desc' },
    });

    const seen = new Set<string>();
    const result: TemporalScoreAggregateDto[] = [];

    for (const agg of allAggregates) {
      if (!seen.has(agg.horizon)) {
        seen.add(agg.horizon);
        result.push(this.mapAggregateToDto(agg));
      }
    }

    // Sort by horizon order
    const horizonOrder: Record<string, number> = {
      SESSION: 0,
      DAILY: 1,
      WEEKLY: 2,
      MONTHLY: 3,
      QUARTERLY: 4,
      YEARLY: 5,
    };

    result.sort((a, b) => (horizonOrder[a.horizon] ?? 0) - (horizonOrder[b.horizon] ?? 0));

    return result;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  getPeriodBounds(horizon: TemporalHorizon, date: Date): { periodStart: Date; periodEnd: Date } {
    const d = new Date(date);

    switch (horizon) {
      case 'SESSION': {
        // Session = same day
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { periodStart: start, periodEnd: end };
      }
      case 'DAILY': {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { periodStart: start, periodEnd: end };
      }
      case 'WEEKLY': {
        const dayOfWeek = d.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { periodStart: start, periodEnd: end };
      }
      case 'MONTHLY': {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return { periodStart: start, periodEnd: end };
      }
      case 'QUARTERLY': {
        const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
        const start = new Date(d.getFullYear(), quarterMonth, 1);
        const end = new Date(d.getFullYear(), quarterMonth + 3, 1);
        return { periodStart: start, periodEnd: end };
      }
      case 'YEARLY': {
        const start = new Date(d.getFullYear(), 0, 1);
        const end = new Date(d.getFullYear() + 1, 0, 1);
        return { periodStart: start, periodEnd: end };
      }
    }
  }

  private async calculateTrend(
    contributorId: string,
    horizon: TemporalHorizon,
    currentScore: number,
    currentPeriodStart: Date,
  ): Promise<ScoreTrend> {
    // Find the previous period's aggregate
    const previousAggregate = await this.prisma.temporalScoreAggregate.findFirst({
      where: {
        contributorId,
        horizon: horizon as never,
        periodStart: { lt: currentPeriodStart },
      },
      orderBy: { periodStart: 'desc' },
    });

    if (!previousAggregate) return 'STABLE';

    const previousScore = Number(previousAggregate.aggregatedScore);
    if (previousScore === 0) return currentScore > 0 ? 'RISING' : 'STABLE';

    // 5% threshold for trend detection
    if (currentScore > previousScore * 1.05) return 'RISING';
    if (currentScore < previousScore * 0.95) return 'DECLINING';
    return 'STABLE';
  }

  private mapAggregateToDto(aggregate: {
    id: string;
    contributorId: string;
    horizon: string;
    periodStart: Date;
    periodEnd: Date;
    aggregatedScore: unknown;
    contributionCount: number;
    trend: string;
    computedAt: Date;
  }): TemporalScoreAggregateDto {
    return {
      id: aggregate.id,
      contributorId: aggregate.contributorId,
      horizon: aggregate.horizon as TemporalHorizon,
      periodStart: aggregate.periodStart.toISOString(),
      periodEnd: aggregate.periodEnd.toISOString(),
      aggregatedScore: Number(aggregate.aggregatedScore),
      contributionCount: aggregate.contributionCount,
      trend: aggregate.trend as ScoreTrend,
      computedAt: aggregate.computedAt.toISOString(),
    };
  }
}
