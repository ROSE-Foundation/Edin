import type { PlatformMetrics } from '@edin/shared';
import { StatCard, StatCardSkeleton } from './stat-card';

interface MetricsStatsGridProps {
  metrics: PlatformMetrics;
}

export function MetricsStatsGrid({ metrics }: MetricsStatsGridProps) {
  const totalContributors =
    metrics.domainDistribution.reduce((sum, d) => sum + d.count, 0) || metrics.activeContributors;

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2">
      <StatCard
        label="Active Contributors"
        value={metrics.activeContributors}
        context="Contributors currently active in the community"
      />
      <StatCard
        label="Contribution Velocity"
        value={
          metrics.contributionVelocity > 0 ? `${metrics.contributionVelocity}/wk` : 'Coming Soon'
        }
        context={
          metrics.contributionVelocity > 0
            ? 'Contributions per week across all domains'
            : 'Tracking begins with contribution ingestion'
        }
      />
      <StatCard
        label="Retention Rate"
        value={metrics.retentionRate > 0 ? `${metrics.retentionRate}%` : '—'}
        context="Percentage of early contributors still active after 30 days"
      />
      <StatCard
        label="Total Contributors"
        value={totalContributors}
        context="Contributors across all four domains"
      />
    </div>
  );
}

export function MetricsStatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}
