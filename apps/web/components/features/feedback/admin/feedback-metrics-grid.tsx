'use client';

import { useFeedbackMetrics } from '../../../../hooks/use-feedback-monitoring';
import { StatCard, StatCardSkeleton } from '../../metrics/stat-card';

export function FeedbackMetricsGrid() {
  const { metrics, slaHours, isLoading, error } = useFeedbackMetrics();

  if (error) {
    return (
      <div className="rounded-[12px] border border-semantic-error/30 bg-surface-raised p-[var(--spacing-lg)] text-center">
        <p className="font-sans text-[14px] text-semantic-error">
          Failed to load feedback metrics.
        </p>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div
        className="grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4"
        role="status"
        aria-label="Loading feedback metrics"
      >
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Pending Reviews"
        value={metrics.pendingCount}
        context="Awaiting reviewer submission"
      />
      <StatCard
        label="Avg Turnaround"
        value={`${metrics.avgTurnaroundHours.toFixed(1)}h`}
        context="Assignment to submission"
      />
      <StatCard
        label="Completion Rate"
        value={`${metrics.completionRate.toFixed(1)}%`}
        context={`${metrics.totalCompleted} of ${metrics.totalAssigned} completed`}
      />
      <StatCard
        label="Overdue"
        value={metrics.overdueCount}
        context={`Exceeding ${slaHours}h SLA`}
      />
    </div>
  );
}
