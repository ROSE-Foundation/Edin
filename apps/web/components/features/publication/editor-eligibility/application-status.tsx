'use client';

import type { EditorApplicationStatus } from '@edin/shared';

const STATUS_STYLES: Record<EditorApplicationStatus, { bg: string; text: string; label: string }> =
  {
    PENDING: { bg: '#FDF6E3', text: '#B08D3A', label: 'Application Pending' },
    APPROVED: { bg: '#E4F0E8', text: '#5A8A6B', label: 'Active Editor' },
    REJECTED: { bg: '#F0E4E4', text: '#A85A5A', label: 'Application Declined' },
    REVOKED: { bg: '#F0E4E4', text: '#A85A5A', label: 'Editor Status Revoked' },
  };

interface ApplicationStatusProps {
  status: EditorApplicationStatus;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt?: string;
}

export function ApplicationStatus({
  status,
  reviewedAt,
  reviewNotes,
  createdAt,
}: ApplicationStatusProps) {
  const style = STATUS_STYLES[status];

  return (
    <div className="flex flex-col gap-[var(--spacing-xs)]">
      <span
        className="inline-block w-fit rounded-[4px] px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
      {createdAt && (
        <span className="font-sans text-[12px] text-text-secondary">
          Applied{' '}
          {new Date(createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      )}
      {reviewedAt && (
        <span className="font-sans text-[12px] text-text-secondary">
          Reviewed{' '}
          {new Date(reviewedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      )}
      {status === 'REJECTED' && reviewNotes && (
        <p className="mt-[var(--spacing-xs)] rounded-[var(--radius-sm)] bg-surface-sunken px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
          {reviewNotes}
        </p>
      )}
    </div>
  );
}
