'use client';

import Link from 'next/link';
import type { FirstTaskRecommendation } from '@edin/shared';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Finance: { bg: 'bg-domain-finance', text: 'text-white' },
  Impact: { bg: 'bg-domain-impact', text: 'text-white' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

interface FirstTaskCardProps {
  task: FirstTaskRecommendation | null;
  isLoading: boolean;
}

export function FirstTaskCard({ task, isLoading }: FirstTaskCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <div className="space-y-[var(--spacing-sm)]">
          <div className="skeleton h-[16px] w-[140px]" />
          <div className="skeleton h-[20px] w-[250px]" />
          <div className="skeleton h-[40px] w-full" />
          <div className="skeleton h-[44px] w-[160px] rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <h3 className="font-sans text-[15px] font-medium text-text-primary">Your First Task</h3>
        <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
          We&apos;re preparing a meaningful starting point for you. Check back soon.
        </p>
      </div>
    );
  }

  const domainColor = DOMAIN_COLORS[task.domain];

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <h3 className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
        Here&apos;s something meaningful you can start with
      </h3>
      <div className="mt-[var(--spacing-md)]">
        <div className="flex items-center gap-[var(--spacing-sm)]">
          <h4 className="font-serif text-[18px] font-bold text-text-primary">{task.taskTitle}</h4>
          {domainColor && (
            <span
              className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
            >
              {task.domain}
            </span>
          )}
        </div>
        <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
          {task.taskDescription}
        </p>
        <div className="mt-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
          Estimated effort: {task.estimatedEffort}
        </div>
        <Link
          href="/dashboard/tasks"
          className="mt-[var(--spacing-md)] inline-flex min-h-[44px] cursor-not-allowed items-center rounded-[var(--radius-md)] bg-accent-primary/40 px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised"
          title="Coming soon — task claiming will be available in a future update"
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
        >
          Claim this task
        </Link>
      </div>
    </div>
  );
}
