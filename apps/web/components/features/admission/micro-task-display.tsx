'use client';

import type { MicroTask } from '@edin/shared';
import { renderRichText } from '../../../lib/rich-text';

interface MicroTaskDisplayProps {
  microTask: MicroTask;
}

export function MicroTaskDisplay({ microTask }: MicroTaskDisplayProps) {
  const descriptionHtml = renderRichText(microTask.description);

  return (
    <div
      className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]"
      aria-label="Micro-task assignment"
    >
      <h3 className="font-serif text-[18px] leading-[1.3] font-bold text-text-primary">
        {microTask.title}
      </h3>
      <div
        className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)] font-serif text-[15px] leading-[1.6] text-text-secondary [&_code]:rounded-[4px] [&_code]:bg-surface-sunken [&_code]:px-[4px] [&_code]:py-[2px] [&_ul]:list-disc [&_ul]:pl-[var(--spacing-lg)]"
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />

      <dl className="mt-[var(--spacing-lg)] space-y-[var(--spacing-sm)]">
        <div>
          <dt className="font-sans text-[13px] font-medium text-text-secondary">
            Expected Deliverable
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-text-primary">
            {microTask.expectedDeliverable}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[13px] font-medium text-text-secondary">
            Estimated Effort
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-text-primary">
            {microTask.estimatedEffort}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[13px] font-medium text-text-secondary">
            Submission Format
          </dt>
          <dd className="mt-[2px] font-sans text-[14px] leading-[1.5] text-text-primary">
            {microTask.submissionFormat}
          </dd>
        </div>
      </dl>
    </div>
  );
}
