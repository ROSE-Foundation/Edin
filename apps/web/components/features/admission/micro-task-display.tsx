'use client';

import type { MicroTask } from '@edin/shared';

interface MicroTaskDisplayProps {
  microTask: MicroTask;
}

export function MicroTaskDisplay({ microTask }: MicroTaskDisplayProps) {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
      aria-label="Micro-task assignment"
    >
      <h3 className="font-serif text-[18px] leading-[1.3] font-bold text-brand-primary">
        {microTask.title}
      </h3>
      <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.6] text-brand-secondary">
        {microTask.description}
      </p>

      <dl className="mt-[var(--spacing-lg)] space-y-[var(--spacing-sm)]">
        <div>
          <dt className="font-sans text-[13px] font-medium text-brand-secondary">
            Expected Deliverable
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-brand-primary">
            {microTask.expectedDeliverable}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[13px] font-medium text-brand-secondary">
            Estimated Effort
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-brand-primary">
            {microTask.estimatedEffort}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[13px] font-medium text-brand-secondary">
            Submission Format
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-brand-primary">
            {microTask.submissionFormat}
          </dd>
        </div>
      </dl>
    </div>
  );
}
