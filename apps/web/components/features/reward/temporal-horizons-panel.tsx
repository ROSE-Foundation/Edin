'use client';

import { useState } from 'react';
import type { TemporalScoreAggregateDto } from '@edin/shared';

interface TemporalHorizonsPanelProps {
  aggregates: TemporalScoreAggregateDto[];
}

const HORIZON_LABELS: Record<string, string> = {
  SESSION: 'Per contribution',
  DAILY: 'Today',
  WEEKLY: 'This week',
  MONTHLY: 'This month',
  QUARTERLY: 'This quarter',
  YEARLY: 'This year',
};

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

export function TemporalHorizonsPanel({ aggregates }: TemporalHorizonsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (aggregates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-[var(--spacing-md)]">
        <p className="font-sans text-[14px] text-neutral-400">
          No temporal aggregates available yet. Scores will appear after contributions are
          evaluated.
        </p>
      </div>
    );
  }

  const displayAggregates = isExpanded ? aggregates : aggregates.slice(0, 2);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="divide-y divide-neutral-100">
        {displayAggregates.map((agg) => (
          <div
            key={agg.id}
            className="flex items-center justify-between px-[var(--spacing-lg)] py-[var(--spacing-md)]"
          >
            <div>
              <p className="font-sans text-[14px] font-medium text-text-primary">
                {HORIZON_LABELS[agg.horizon] ?? agg.horizon}
              </p>
              <p className="font-sans text-[12px] text-neutral-400">
                {agg.contributionCount} contribution{agg.contributionCount !== 1 ? 's' : ''},{' '}
                {trendLabel(agg.trend)}
              </p>
            </div>
            <p className="font-serif text-[20px] font-semibold text-text-primary">
              {agg.aggregatedScore.toFixed(1)}
            </p>
          </div>
        ))}
      </div>
      {aggregates.length > 2 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full border-t border-neutral-100 px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-500 hover:bg-neutral-50"
        >
          {isExpanded ? 'Show less' : `Show all ${aggregates.length} horizons`}
        </button>
      )}
    </div>
  );
}
