'use client';

import type { CombinedContributorMetric } from '@edin/shared';

interface CombinedMetricsTableProps {
  data: CombinedContributorMetric[];
}

export function CombinedMetricsTable({ data }: CombinedMetricsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No combined metrics available yet. Data will appear once sprint and evaluation data exist.
        </p>
      </div>
    );
  }

  return (
    <table
      className="w-full text-left font-sans text-[14px]"
      aria-label="Combined sprint and evaluation metrics per contributor"
    >
      <thead>
        <tr className="border-b border-surface-subtle">
          <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Contributor</th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Sprints
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Planned
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Delivered
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Accuracy
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Evaluations
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Avg Score
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((metric) => (
          <tr key={metric.contributorId} className="border-b border-surface-subtle/50">
            <td className="py-[var(--spacing-sm)] text-text-primary">
              {metric.contributorName ?? metric.githubUsername ?? metric.contributorId.slice(0, 8)}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.sprintCount}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.totalPlannedPoints}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.totalDeliveredPoints}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.averageAccuracy != null ? `${metric.averageAccuracy}%` : '\u2014'}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.evaluationCount}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {metric.averageEvaluationScore != null ? metric.averageEvaluationScore : '\u2014'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
