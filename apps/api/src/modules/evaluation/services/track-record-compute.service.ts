import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

// NO imports from evaluation.service.js, combined-evaluation.service.js,
// or any scoring/formula module — NP-NFR2 stream independence

@Injectable()
export class TrackRecordComputeService {
  private readonly logger = new Logger(TrackRecordComputeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes cumulative track-record metrics for a contributor.
   * Reads ONLY from contributions and activity_events — never from
   * evaluations, contribution_scores, or scoring_formula_versions (NP-NFR2).
   */
  async computeTrackRecord(contributorId: string) {
    this.logger.log('Computing track record', { contributorId });

    // 1. Determine evaluation period from contributor's earliest contribution
    const firstContribution = await this.prisma.contribution.findFirst({
      where: { contributorId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const now = new Date();
    const evaluationPeriodStart = firstContribution?.createdAt ?? now;
    const evaluationPeriodEnd = now;

    // 2. Contribution count (reads from contributions table only — AC4)
    const contributionCount = await this.prisma.contribution.count({
      where: { contributorId },
    });

    // 3. Domain breadth from working group memberships
    const memberships = await this.prisma.workingGroupMember.findMany({
      where: { contributorId },
      include: { workingGroup: { select: { domain: true } } },
    });
    const uniqueDomains = new Set(memberships.map((m) => m.workingGroup.domain));
    const domainBreadth = uniqueDomains.size;

    // 4. Engagement duration in months
    const engagementDurationMonths = this.computeMonthsDifference(
      evaluationPeriodStart,
      evaluationPeriodEnd,
    );

    // 5. Active weeks ratio from activity_events (reads from activity_events only — AC4)
    const activityEvents = await this.prisma.activityEvent.findMany({
      where: { contributorId },
      select: { createdAt: true },
    });

    const totalWeeks = this.computeTotalWeeks(evaluationPeriodStart, evaluationPeriodEnd);
    const activeWeeks = this.computeActiveWeeks(activityEvents.map((e) => e.createdAt));
    const activeWeeksRatio =
      totalWeeks > 0 ? Math.min(Number((activeWeeks / totalWeeks).toFixed(2)), 1.0) : 0;

    // 6. Consistency score based on contribution regularity
    const contributionDates = await this.prisma.contribution.findMany({
      where: { contributorId },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const consistencyScore = this.computeConsistencyScore(
      contributionDates.map((c) => c.createdAt),
      activeWeeksRatio,
    );

    // 7. Create track record evaluation record
    const trackRecordEvaluation = await this.prisma.trackRecordEvaluation.create({
      data: {
        contributorId,
        evaluationPeriodStart,
        evaluationPeriodEnd,
        consistencyScore: new Prisma.Decimal(consistencyScore.toFixed(2)),
        engagementDurationMonths,
        contributionCount,
        domainBreadth,
        activeWeeksRatio: new Prisma.Decimal(activeWeeksRatio.toFixed(2)),
        metadata: {
          computedBy: 'TrackRecordComputeService',
          version: '1.0',
          activeWeeks,
          totalWeeks,
        } as Prisma.InputJsonValue,
      },
    });

    this.logger.log('Track record computed', {
      contributorId,
      trackRecordEvaluationId: trackRecordEvaluation.id,
      contributionCount,
      domainBreadth,
      engagementDurationMonths,
      activeWeeksRatio,
      consistencyScore,
    });

    return trackRecordEvaluation;
  }

  /**
   * Computes the number of full months between two dates.
   */
  private computeMonthsDifference(start: Date, end: Date): number {
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    return Math.max(0, years * 12 + months);
  }

  /**
   * Computes total ISO weeks in a date range.
   */
  private computeTotalWeeks(start: Date, end: Date): number {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / msPerWeek));
  }

  /**
   * Counts distinct ISO weeks that have at least one event.
   */
  private computeActiveWeeks(dates: Date[]): number {
    const weekKeys = new Set<string>();
    for (const date of dates) {
      weekKeys.add(this.getISOWeekKey(date));
    }
    return weekKeys.size;
  }

  /**
   * Returns a string key representing the ISO week of a date (e.g., "2026-W12").
   */
  private getISOWeekKey(date: Date): string {
    const d = new Date(date.getTime());
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  /**
   * Computes a consistency score (0-100) based on:
   * - activeWeeksRatio (weight: 60%) — regular engagement
   * - contribution regularity (weight: 40%) — low std deviation of inter-contribution intervals
   */
  private computeConsistencyScore(contributionDates: Date[], activeWeeksRatio: number): number {
    if (contributionDates.length <= 1) {
      // Single or no contributions: score based purely on activity ratio
      return Number((activeWeeksRatio * 60).toFixed(2));
    }

    // Compute intervals between contributions in days
    const intervals: number[] = [];
    for (let i = 1; i < contributionDates.length; i++) {
      const diffMs = contributionDates[i].getTime() - contributionDates[i - 1].getTime();
      intervals.push(diffMs / (1000 * 60 * 60 * 24)); // convert to days
    }

    // Compute coefficient of variation (CV) of intervals
    const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Lower CV = more regular = higher regularity score
    // CV of 0 = perfectly regular (score 40), CV >= 2 = very irregular (score 0)
    const regularityScore = Math.max(0, Math.min(40, 40 * (1 - cv / 2)));

    // Combined: 60% activity ratio + 40% regularity
    const activityComponent = activeWeeksRatio * 60;
    const total = activityComponent + regularityScore;

    return Number(Math.min(100, total).toFixed(2));
  }
}
