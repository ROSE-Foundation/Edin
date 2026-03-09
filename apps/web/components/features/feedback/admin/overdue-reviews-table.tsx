'use client';

import { useState } from 'react';
import { useOverdueReviews, useFeedbackSla } from '../../../../hooks/use-feedback-monitoring';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { ReassignDialog } from './reassign-dialog';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function getElapsedColor(hoursElapsed: number, slaHours: number): string {
  if (hoursElapsed > slaHours * 2) return 'text-semantic-error';
  if (hoursElapsed > slaHours * 1.5) return 'text-semantic-warning';
  return 'text-brand-primary';
}

export function OverdueReviewsTable() {
  const { reviews, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useOverdueReviews();
  const { hours: slaHours } = useFeedbackSla();
  const [reassignId, setReassignId] = useState<string | null>(null);

  const selectedReview = reassignId ? reviews.find((r) => r.id === reassignId) : null;

  if (error) {
    return (
      <div>
        <h2 className="mb-[var(--spacing-md)] font-sans text-[18px] font-semibold text-brand-primary">
          Overdue Reviews
        </h2>
        <div className="rounded-[12px] border border-semantic-error/30 bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="font-sans text-[14px] text-semantic-error">
            Failed to load overdue reviews.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading overdue reviews">
        <h2 className="mb-[var(--spacing-md)] font-sans text-[18px] font-semibold text-brand-primary">
          Overdue Reviews
        </h2>
        <div className="rounded-[12px] border border-surface-border bg-surface-raised">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-[var(--spacing-md)] border-b border-surface-border p-[var(--spacing-md)] last:border-b-0"
            >
              <div className="skeleton h-[16px] w-[120px]" />
              <div className="skeleton h-[16px] flex-1" />
              <div className="skeleton h-[16px] w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-[var(--spacing-md)] font-sans text-[18px] font-semibold text-brand-primary">
        Overdue Reviews
      </h2>

      {reviews.length === 0 ? (
        <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="font-sans text-[14px] text-brand-secondary">
            No overdue reviews. All feedback is within SLA.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-[12px] border border-surface-border bg-surface-raised md:block">
            {/* Header */}
            <div className="grid grid-cols-[200px_1fr_120px_140px_120px_100px] gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Reviewer
              </span>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Contribution
              </span>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Domain
              </span>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Assigned
              </span>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Elapsed
              </span>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-wide text-brand-secondary">
                Action
              </span>
            </div>
            {/* Rows */}
            {reviews.map((review) => {
              const domainColor = DOMAIN_COLORS[review.domain];
              const elapsedColor = getElapsedColor(review.hoursElapsed, slaHours);

              return (
                <div
                  key={review.id}
                  className="grid min-h-[48px] grid-cols-[200px_1fr_120px_140px_120px_100px] items-center gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)] last:border-b-0 hover:bg-surface-sunken/50"
                >
                  <span className="truncate font-sans text-[14px] text-brand-primary">
                    {review.reviewerName}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-sans text-[14px] text-brand-primary">
                      {review.contributionTitle}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[1px] font-sans text-[11px] text-brand-secondary">
                      {review.contributionType}
                    </span>
                  </div>
                  <span>
                    {domainColor ? (
                      <span
                        className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                      >
                        {review.domain}
                      </span>
                    ) : (
                      <span className="font-sans text-[13px] text-brand-secondary">
                        {review.domain}
                      </span>
                    )}
                  </span>
                  <span className="font-sans text-[13px] text-brand-secondary">
                    {formatRelativeDate(review.assignedAt)}
                  </span>
                  <span className={`font-sans text-[14px] font-medium ${elapsedColor}`}>
                    {review.hoursElapsed.toFixed(1)}h
                  </span>
                  <button
                    type="button"
                    onClick={() => setReassignId(review.id)}
                    className="font-sans text-[13px] font-medium text-brand-accent transition-colors hover:text-brand-accent/80"
                    aria-label={`Reassign review for ${review.contributionTitle}`}
                  >
                    Reassign
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="space-y-[var(--spacing-sm)] md:hidden">
            {reviews.map((review) => {
              const domainColor = DOMAIN_COLORS[review.domain];
              const elapsedColor = getElapsedColor(review.hoursElapsed, slaHours);

              return (
                <div
                  key={review.id}
                  className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-[14px] font-medium text-brand-primary">
                        {review.reviewerName}
                      </p>
                      <p className="mt-[var(--spacing-xs)] truncate font-sans text-[13px] text-brand-secondary">
                        {review.contributionTitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReassignId(review.id)}
                      className="ml-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-accent"
                      aria-label={`Reassign review for ${review.contributionTitle}`}
                    >
                      Reassign
                    </button>
                  </div>
                  <div className="mt-[var(--spacing-sm)] flex items-center gap-[var(--spacing-md)]">
                    {domainColor && (
                      <span
                        className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium ${domainColor.bg} ${domainColor.text}`}
                      >
                        {review.domain}
                      </span>
                    )}
                    <span className="font-sans text-[12px] text-brand-secondary">
                      {formatRelativeDate(review.assignedAt)}
                    </span>
                    <span className={`font-sans text-[13px] font-medium ${elapsedColor}`}>
                      {review.hoursElapsed.toFixed(1)}h elapsed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="mt-[var(--spacing-md)] text-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-secondary transition-colors hover:bg-surface-sunken disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      <ReassignDialog
        key={reassignId}
        feedbackId={reassignId}
        review={selectedReview ?? null}
        open={!!reassignId}
        onOpenChange={(open) => {
          if (!open) setReassignId(null);
        }}
      />
    </div>
  );
}
