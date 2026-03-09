'use client';

import { FeedbackMetricsGrid } from './feedback-metrics-grid';
import { SlaSetting } from './sla-setting';
import { OverdueReviewsTable } from './overdue-reviews-table';

export function FeedbackMonitoringDashboard() {
  return (
    <div className="space-y-[var(--spacing-xl)]">
      <FeedbackMetricsGrid />
      <SlaSetting />
      <OverdueReviewsTable />
    </div>
  );
}
