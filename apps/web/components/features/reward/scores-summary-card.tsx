'use client';

import type { ContributorScoresSummaryDto } from '@edin/shared';

interface ScoresSummaryCardProps {
  summary: ContributorScoresSummaryDto;
}

function trendLabel(trend: string): string {
  switch (trend) {
    case 'RISING':
      return 'rising';
    case 'DECLINING':
      return 'declining';
    default:
      return 'stable';
  }
}

export function ScoresSummaryCard({ summary }: ScoresSummaryCardProps) {
  const latestScore = summary.latestSessionScore?.compositeScore;
  const monthlyTrend = summary.monthlyAggregate?.trend ?? 'STABLE';
  const monthlyScore = summary.monthlyAggregate?.aggregatedScore;
  const monthlyCount = summary.monthlyAggregate?.contributionCount ?? 0;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-[var(--spacing-lg)]">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-sans text-[13px] text-neutral-500">Latest Score</p>
          <p className="font-serif text-[32px] font-bold text-brand-primary">
            {latestScore !== undefined && latestScore !== null ? latestScore.toFixed(1) : '—'}
          </p>
        </div>
        {monthlyScore !== undefined && monthlyScore !== null && (
          <div className="text-right">
            <p className="font-sans text-[13px] text-neutral-500">This month</p>
            <p className="font-serif text-[20px] font-semibold text-brand-primary">
              {monthlyScore.toFixed(1)}
            </p>
            <p className="font-sans text-[12px] text-neutral-400">
              {monthlyCount} contribution{monthlyCount !== 1 ? 's' : ''}, {trendLabel(monthlyTrend)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
