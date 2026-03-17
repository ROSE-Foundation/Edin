'use client';

import type { ArticleStatus } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';

const LIFECYCLE_STEPS: { status: ArticleStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Draft' },
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'EDITORIAL_REVIEW', label: 'In Review' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'PUBLISHED', label: 'Published' },
];

const STATUS_ORDER: Record<ArticleStatus, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  EDITORIAL_REVIEW: 2,
  REVISION_REQUESTED: 2, // same level as editorial review (branch)
  APPROVED: 3,
  PUBLISHED: 4,
  ARCHIVED: -1,
};

interface ArticleLifecycleProps {
  currentStatus: ArticleStatus;
  domain?: string;
}

export function ArticleLifecycle({ currentStatus, domain }: ArticleLifecycleProps) {
  const accentColor = domain ? (DOMAIN_COLORS[domain] ?? '#6B7B8D') : '#6B7B8D';
  const currentOrder = STATUS_ORDER[currentStatus] ?? -1;
  const isRevisionRequested = currentStatus === 'REVISION_REQUESTED';
  const isArchived = currentStatus === 'ARCHIVED';

  if (isArchived) {
    return (
      <div className="flex items-center gap-[var(--spacing-sm)]">
        <span
          className="rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-surface-raised"
          style={{ backgroundColor: '#A85A5A' }}
        >
          Archived
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-xs)]">
      <div className="flex items-center gap-[var(--spacing-xs)]">
        {LIFECYCLE_STEPS.map((step, index) => {
          const stepOrder = STATUS_ORDER[step.status];
          const isCompleted = stepOrder < currentOrder;
          const isCurrent = step.status === currentStatus;
          const isFuture = stepOrder > currentOrder;

          return (
            <div key={step.status} className="flex items-center">
              {index > 0 && (
                <div
                  className="mx-[2px] h-[2px] w-[16px]"
                  style={{
                    backgroundColor:
                      isCompleted || isCurrent ? '#5A8A6B' : 'var(--color-surface-border, #E8E6E1)',
                  }}
                />
              )}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-[10px] w-[10px] items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isCurrent
                      ? accentColor
                      : isCompleted
                        ? '#5A8A6B'
                        : 'transparent',
                    border: isFuture ? '2px solid var(--color-surface-border, #E8E6E1)' : 'none',
                  }}
                  title={step.label}
                />
                <span
                  className="mt-[2px] font-sans text-[10px]"
                  style={{
                    color: isCurrent
                      ? accentColor
                      : isCompleted
                        ? '#5A8A6B'
                        : 'var(--color-text-secondary, #6B7B8D)',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {isRevisionRequested && (
        <div className="ml-[calc(16px*2+10px*2+2px*2)] flex items-center gap-[var(--spacing-xs)]">
          <span
            className="animate-pulse rounded-full px-[var(--spacing-sm)] py-[1px] font-sans text-[10px] font-medium"
            style={{ backgroundColor: '#C17C60', color: 'white' }}
          >
            Revision Requested
          </span>
        </div>
      )}
    </div>
  );
}

// Compact badge variant for use in cards
export function StatusBadge({
  status,
  domain: _domain,
}: {
  status: ArticleStatus;
  domain?: string;
}) {
  const colors: Record<string, { bg: string; text: string }> = {
    DRAFT: {
      bg: 'var(--color-surface-sunken, #F2F0EB)',
      text: 'var(--color-text-secondary, #6B7B8D)',
    },
    SUBMITTED: { bg: '#E8EDF2', text: '#4A6FA5' },
    EDITORIAL_REVIEW: { bg: '#E8EDF2', text: '#4A6FA5' },
    REVISION_REQUESTED: { bg: '#FAEAE4', text: '#C17C60' },
    APPROVED: { bg: '#E4F0E8', text: '#5A8A6B' },
    PUBLISHED: { bg: '#E4F0E8', text: '#5A8A6B' },
    ARCHIVED: { bg: '#F0E4E4', text: '#A85A5A' },
  };

  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    EDITORIAL_REVIEW: 'In Review',
    REVISION_REQUESTED: 'Revisions Requested',
    APPROVED: 'Approved',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
  };

  const color = colors[status] ?? colors.DRAFT;

  return (
    <span
      className="rounded-[4px] px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] font-medium"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {labels[status] ?? status}
    </span>
  );
}
