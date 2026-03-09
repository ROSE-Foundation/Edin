'use client';

import type { EvaluationStatus } from '@edin/shared';

interface EvaluationStatusBadgeProps {
  status: EvaluationStatus | null;
}

export function EvaluationStatusBadge({ status }: EvaluationStatusBadgeProps) {
  if (!status) {
    return null;
  }

  if (status === 'PENDING' || status === 'IN_PROGRESS') {
    return (
      <span
        role="status"
        aria-label="Evaluation in progress"
        className="inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium text-brand-secondary"
      >
        <span className="skeleton mr-[var(--spacing-xs)] inline-block h-[6px] w-[6px] rounded-full" />
        Evaluation in progress
      </span>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <span
        role="status"
        aria-label="Evaluated"
        className="inline-flex items-center rounded-full bg-brand-accent/10 px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium text-brand-accent/80"
      >
        Evaluated
      </span>
    );
  }

  // FAILED — graceful degradation, show as pending
  return (
    <span
      role="status"
      aria-label="Evaluation pending"
      className="inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium text-brand-secondary"
    >
      Evaluation pending
    </span>
  );
}
