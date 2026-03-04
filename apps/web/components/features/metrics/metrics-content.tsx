'use client';

import type { PlatformMetrics } from '@edin/shared';
import { usePlatformMetrics } from '../../../hooks/use-platform-metrics';
import { MetricsStatsGrid } from './metrics-stats-grid';
import { DomainDistributionChart } from './domain-distribution-chart';
import { MetricsEmptyState } from './metrics-empty-state';

interface MetricsContentProps {
  initialMetrics: PlatformMetrics;
}

export function MetricsContent({ initialMetrics }: MetricsContentProps) {
  const { metrics } = usePlatformMetrics(initialMetrics);
  const data = metrics ?? initialMetrics;

  if (data.activeContributors === 0) {
    return <MetricsEmptyState />;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <MetricsStatsGrid metrics={data} />
      <DomainDistributionChart data={data.domainDistribution} />
    </div>
  );
}
