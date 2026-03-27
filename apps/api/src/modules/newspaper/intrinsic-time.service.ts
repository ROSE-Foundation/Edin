import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client/client.js';
import type {
  ActivityEvent as PrismaActivityEvent,
  ActivityEventType as PrismaActivityEventType,
} from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { NewspaperItemService } from './newspaper-item.service.js';
import type { NewspaperEditionPublishedEvent } from '@edin/shared';

const NEWSPAPER_FEED_CHANNEL = 'newspaper-feed';

/** Activity event types that qualify as "significant" for edition triggering */
export const SIGNIFICANT_EVENT_TYPES = [
  'PRIZE_AWARDED',
  'TRACK_RECORD_MILESTONE_CROSSED',
  'PEER_NOMINATION_RECEIVED',
  'CROSS_DOMAIN_COLLABORATION_DETECTED',
  'HIGH_SIGNIFICANCE_CONTRIBUTION',
] as const;

export interface IntrinsicTimeConfig {
  lookbackHours: number;
  eventThreshold: number;
  maxIntervalDays: number;
  checkIntervalMs: number;
  comparisonWindowDays: number;
}

@Injectable()
export class IntrinsicTimeService {
  private readonly logger = new Logger(IntrinsicTimeService.name);
  private readonly config: IntrinsicTimeConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly redisService: RedisService,
    private readonly newspaperItemService: NewspaperItemService,
    configService: ConfigService,
  ) {
    this.config = {
      lookbackHours: Number(configService.get('NEWSPAPER_LOOKBACK_HOURS', '72')),
      eventThreshold: Number(configService.get('NEWSPAPER_EVENT_THRESHOLD', '5')),
      maxIntervalDays: Number(configService.get('NEWSPAPER_MAX_INTERVAL_DAYS', '7')),
      checkIntervalMs: Number(configService.get('NEWSPAPER_CHECK_INTERVAL_MS', '900000')),
      comparisonWindowDays: Number(configService.get('NEWSPAPER_COMPARISON_WINDOW_DAYS', '30')),
    };
  }

  /**
   * Main entry point called by the BullMQ processor every 15 minutes.
   * Evaluates whether a new edition should be created based on event density.
   */
  async evaluateAndCreateEdition(correlationId: string): Promise<void> {
    this.logger.log('Evaluating edition trigger condition', {
      module: 'newspaper',
      correlationId,
    });

    // 1. Find the most recent edition's temporal_span_end
    const lastEdition = await this.prisma.newspaperEdition.findFirst({
      where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
      orderBy: { editionNumber: 'desc' },
      select: { id: true, editionNumber: true, temporalSpanEnd: true, status: true },
    });

    const cutoffDate = lastEdition?.temporalSpanEnd ?? new Date(0);

    // 2. Check for existing DRAFT edition (idempotency)
    if (lastEdition?.status === 'DRAFT') {
      this.logger.debug('DRAFT edition already exists, skipping creation', {
        module: 'newspaper',
        editionId: lastEdition.id,
        correlationId,
      });
      return;
    }

    // 3. Query qualifying activity events since last edition
    const qualifyingEvents = await this.prisma.activityEvent.findMany({
      where: {
        eventType: { in: [...SIGNIFICANT_EVENT_TYPES] as PrismaActivityEventType[] },
        createdAt: { gt: cutoffDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    const eventCount = qualifyingEvents.length;
    const hoursSinceLastEdition = (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60);
    const daysSinceLastEdition = hoursSinceLastEdition / 24;

    // 4. Evaluate trigger conditions
    if (eventCount >= this.config.eventThreshold) {
      this.logger.log('Event threshold met, creating new edition', {
        module: 'newspaper',
        eventCount,
        threshold: this.config.eventThreshold,
        correlationId,
      });
      await this.createEdition(qualifyingEvents, false, correlationId);
    } else if (daysSinceLastEdition >= this.config.maxIntervalDays) {
      this.logger.log('Max interval reached, creating quiet-period edition', {
        module: 'newspaper',
        daysSinceLastEdition: Math.round(daysSinceLastEdition * 10) / 10,
        maxIntervalDays: this.config.maxIntervalDays,
        correlationId,
      });
      // For quiet period, include any available events (even minor ones)
      const allRecentEvents =
        qualifyingEvents.length > 0
          ? qualifyingEvents
          : await this.prisma.activityEvent.findMany({
              where: { createdAt: { gt: cutoffDate } },
              orderBy: { createdAt: 'asc' },
              take: 20,
            });
      await this.createEdition(allRecentEvents, true, correlationId);
    } else {
      this.logger.debug('No edition trigger, insufficient events and within max interval', {
        module: 'newspaper',
        eventCount,
        threshold: this.config.eventThreshold,
        daysSinceLastEdition: Math.round(daysSinceLastEdition * 10) / 10,
        correlationId,
      });
    }
  }

  /**
   * Creates a new newspaper edition from qualifying events.
   */
  private async createEdition(
    events: PrismaActivityEvent[],
    isQuietPeriod: boolean,
    correlationId: string,
  ): Promise<void> {
    const now = new Date();

    // Compute temporal span
    const temporalSpanStart =
      events.length > 0
        ? events[0].createdAt
        : new Date(now.getTime() - this.config.maxIntervalDays * 24 * 60 * 60 * 1000);
    const temporalSpanEnd = events.length > 0 ? events[events.length - 1].createdAt : now;

    // Compute event density (events per hour)
    const spanHours = Math.max(
      (temporalSpanEnd.getTime() - temporalSpanStart.getTime()) / (1000 * 60 * 60),
      0.01, // prevent division by zero
    );
    const eventDensity = events.length / spanHours;

    // Compute significance distribution
    const significanceDistribution = this.computeSignificanceDistribution(events);

    // Compute reference scale metadata
    const referenceScaleMetadata = await this.computeReferenceScaleMetadata(
      temporalSpanStart,
      temporalSpanEnd,
      events.length,
      eventDensity,
      significanceDistribution,
      isQuietPeriod,
    );

    // Determine next edition number
    const maxEdition = await this.prisma.newspaperEdition.aggregate({
      _max: { editionNumber: true },
    });
    const nextEditionNumber = (maxEdition._max.editionNumber ?? 0) + 1;

    // Create the edition as DRAFT
    const edition = await this.prisma.newspaperEdition.create({
      data: {
        editionNumber: nextEditionNumber,
        status: 'DRAFT',
        temporalSpanStart,
        temporalSpanEnd,
        eventCount: events.length,
        eventDensity: new Prisma.Decimal(eventDensity.toFixed(4)),
        significanceDistribution: significanceDistribution as Prisma.InputJsonValue,
        referenceScaleMetadata: referenceScaleMetadata as Prisma.InputJsonValue,
      },
    });

    this.logger.log('Edition created as DRAFT', {
      module: 'newspaper',
      editionId: edition.id,
      editionNumber: nextEditionNumber,
      eventCount: events.length,
      correlationId,
    });

    // Generate newspaper items
    await this.newspaperItemService.generateItemsForEdition(edition.id, events);

    // Transition to PUBLISHED
    const publishedEdition = await this.prisma.newspaperEdition.update({
      where: { id: edition.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    this.logger.log('Edition published', {
      module: 'newspaper',
      editionId: publishedEdition.id,
      editionNumber: publishedEdition.editionNumber,
      correlationId,
    });

    // Emit NEWSPAPER_EDITION_PUBLISHED activity event
    // Use the first contributor from events, or a system placeholder
    const firstContributorId = events.length > 0 ? events[0].contributorId : null;
    if (firstContributorId) {
      await this.activityService.createActivityEvent({
        eventType: 'NEWSPAPER_EDITION_PUBLISHED',
        title: `Newspaper Edition #${nextEditionNumber} published`,
        description: referenceScaleMetadata.significance_summary,
        contributorId: firstContributorId,
        domain: events[0].domain as never,
        entityId: edition.id,
        metadata: {
          editionId: edition.id,
          editionNumber: nextEditionNumber,
          itemCount: events.length,
          isQuietPeriod,
        },
      });
    }

    // Publish to Redis for SSE
    const ssePayload: NewspaperEditionPublishedEvent = {
      eventType: 'newspaper.edition.published',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        editionId: edition.id,
        editionNumber: nextEditionNumber,
        itemCount: events.length,
        temporalSpanStart: temporalSpanStart.toISOString(),
        temporalSpanEnd: temporalSpanEnd.toISOString(),
      },
    };
    await this.redisService.publish(NEWSPAPER_FEED_CHANNEL, JSON.stringify(ssePayload));
  }

  /**
   * Computes significance distribution by counting events per significance tier (1-5).
   */
  computeSignificanceDistribution(events: PrismaActivityEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      tier5: 0,
    };

    for (const event of events) {
      const tier = this.deriveSignificanceTier(event);
      const tierKey = `tier${tier}`;
      distribution[tierKey]++;
    }

    return distribution;
  }

  /**
   * Derives a discrete significance tier (1-5) from an activity event.
   */
  deriveSignificanceTier(event: PrismaActivityEvent): number {
    const metadata = event.metadata as Record<string, unknown> | null;

    switch (event.eventType) {
      case 'PRIZE_AWARDED': {
        const significanceLevel = (metadata?.significanceLevel as number) ?? 1;
        // Prize significance 1-3 maps to tiers 3-5
        return Math.min(Math.max(significanceLevel + 2, 1), 5);
      }
      case 'HIGH_SIGNIFICANCE_CONTRIBUTION':
        return 4;
      case 'CROSS_DOMAIN_COLLABORATION_DETECTED':
        return 3;
      case 'TRACK_RECORD_MILESTONE_CROSSED':
        return 3;
      case 'PEER_NOMINATION_RECEIVED':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Computes human-readable reference scale metadata for the edition.
   */
  private async computeReferenceScaleMetadata(
    temporalSpanStart: Date,
    temporalSpanEnd: Date,
    eventCount: number,
    eventDensity: number,
    significanceDistribution: Record<string, number>,
    isQuietPeriod: boolean,
  ): Promise<{
    temporal_span_human_readable: string;
    significance_summary: string;
    comparison_context: string;
  }> {
    // Temporal span human-readable
    const spanMs = temporalSpanEnd.getTime() - temporalSpanStart.getTime();
    const spanHours = spanMs / (1000 * 60 * 60);
    const temporal_span_human_readable = this.formatTemporalSpan(
      spanHours,
      temporalSpanStart,
      temporalSpanEnd,
    );

    // Significance summary
    const significance_summary = this.formatSignificanceSummary(significanceDistribution);

    // Comparison context — compare to 30-day average density
    const comparison_context = await this.computeComparisonContext(eventDensity, isQuietPeriod);

    return {
      temporal_span_human_readable,
      significance_summary,
      comparison_context,
    };
  }

  /**
   * Formats a temporal span into a human-readable string.
   */
  formatTemporalSpan(spanHours: number, start: Date, end: Date): string {
    if (spanHours < 1) {
      const minutes = Math.round(spanHours * 60);
      return `covers the last ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    if (spanHours < 48) {
      const hours = Math.round(spanHours);
      return `covers the last ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.round(spanHours / 24);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `covers ${days} days of activity, ${startStr}\u2013${endStr}`;
  }

  /**
   * Formats the significance distribution into a summary string.
   */
  formatSignificanceSummary(distribution: Record<string, number>): string {
    const parts: string[] = [];
    // Map tiers to labels
    const tierLabels: Record<string, string> = {
      tier5: 'breakthrough',
      tier4: 'high-impact',
      tier3: 'collaboration',
      tier2: 'community',
      tier1: 'event',
    };

    for (const [tier, label] of Object.entries(tierLabels)) {
      const count = distribution[tier] ?? 0;
      if (count > 0) {
        parts.push(`${count} ${label}${count !== 1 ? 's' : ''}`);
      }
    }

    return parts.length > 0 ? parts.join(', ') : 'no significant events';
  }

  /**
   * Computes structured density comparison data for the reference scale endpoint.
   * Returns activityLevel category and numeric densityRatio.
   */
  async computeDensityComparison(
    eventDensity: number,
    excludeEditionId?: string,
  ): Promise<{
    activityLevel: 'high' | 'above-average' | 'normal' | 'below-average' | 'low';
    densityRatio: number | null;
  }> {
    const comparisonWindowStart = new Date(
      Date.now() - this.config.comparisonWindowDays * 24 * 60 * 60 * 1000,
    );

    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      createdAt: { gte: comparisonWindowStart },
    };
    if (excludeEditionId) {
      where.id = { not: excludeEditionId };
    }

    const recentEditions = await this.prisma.newspaperEdition.findMany({
      where,
      select: { eventDensity: true },
    });

    if (recentEditions.length === 0) {
      return { activityLevel: 'normal', densityRatio: null };
    }

    const avgDensity =
      recentEditions.reduce((sum, e) => sum + Number(e.eventDensity), 0) / recentEditions.length;

    if (avgDensity === 0) {
      return { activityLevel: 'normal', densityRatio: null };
    }

    const ratio = eventDensity / avgDensity;
    const roundedRatio = Math.round(ratio * 10) / 10;

    let activityLevel: 'high' | 'above-average' | 'normal' | 'below-average' | 'low';
    if (ratio >= 2.5) {
      activityLevel = 'high';
    } else if (ratio >= 1.5) {
      activityLevel = 'above-average';
    } else if (ratio >= 0.5) {
      activityLevel = 'normal';
    } else if (ratio >= 0.2) {
      activityLevel = 'below-average';
    } else {
      activityLevel = 'low';
    }

    return { activityLevel, densityRatio: roundedRatio };
  }

  /**
   * Computes comparison context by comparing current density to the 30-day rolling average.
   */
  private async computeComparisonContext(
    currentDensity: number,
    isQuietPeriod: boolean,
  ): Promise<string> {
    if (isQuietPeriod) {
      return 'Low activity period \u2014 below average density';
    }

    const comparisonWindowStart = new Date(
      Date.now() - this.config.comparisonWindowDays * 24 * 60 * 60 * 1000,
    );

    const recentEditions = await this.prisma.newspaperEdition.findMany({
      where: {
        status: 'PUBLISHED',
        createdAt: { gte: comparisonWindowStart },
      },
      select: { eventDensity: true },
    });

    if (recentEditions.length === 0) {
      return 'First edition \u2014 establishing activity baseline';
    }

    const avgDensity =
      recentEditions.reduce((sum, e) => sum + Number(e.eventDensity), 0) / recentEditions.length;

    if (avgDensity === 0) {
      return 'Normal activity';
    }

    const ratio = currentDensity / avgDensity;
    const roundedRatio = Math.round(ratio * 10) / 10;

    if (ratio >= 2.5) {
      return `High activity \u2014 ${roundedRatio}x the ${this.config.comparisonWindowDays}-day average density`;
    }
    if (ratio >= 1.5) {
      return `Above average activity \u2014 ${roundedRatio}x average`;
    }
    if (ratio >= 0.5) {
      return `Normal activity \u2014 ${roundedRatio}x average`;
    }
    return `Below average activity \u2014 ${roundedRatio}x average`;
  }
}
