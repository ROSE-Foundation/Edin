import { MetricsHeroSkeleton } from './metrics-hero';
import { MetricsStatsGridSkeleton } from './metrics-stats-grid';

export function MetricsSkeleton() {
  return (
    <div role="status" aria-label="Loading metrics page">
      <MetricsHeroSkeleton />
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <MetricsStatsGridSkeleton />
        <div className="mt-[var(--spacing-xl)]">
          <div className="skeleton h-[24px] w-[200px]" />
          <div className="skeleton mt-[var(--spacing-md)] h-[300px] w-full rounded-[12px]" />
        </div>
      </div>
    </div>
  );
}
