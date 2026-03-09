'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  useEligibleReviewers,
  useReassignFeedback,
} from '../../../../hooks/use-feedback-monitoring';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import type { OverdueReviewDto } from '@edin/shared';

interface ReassignDialogProps {
  feedbackId: string | null;
  review: OverdueReviewDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignDialog({ feedbackId, review, open, onOpenChange }: ReassignDialogProps) {
  const {
    reviewers,
    isLoading: loadingReviewers,
    error: reviewersError,
  } = useEligibleReviewers(feedbackId);
  const reassign = useReassignFeedback();
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [reason, setReason] = useState('');

  function handleClose() {
    setSelectedReviewerId('');
    setReason('');
    onOpenChange(false);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!feedbackId || !selectedReviewerId || reason.length < 10) return;

    reassign.mutate(
      { feedbackId, newReviewerId: selectedReviewerId, reason },
      { onSuccess: handleClose },
    );
  }

  const canSubmit = selectedReviewerId && reason.length >= 10 && !reassign.isPending;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 motion-safe:transition-opacity motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-0 right-0 z-40 flex h-full w-full max-w-[480px] flex-col border-l border-surface-border bg-surface-raised shadow-[var(--shadow-modal)] focus:outline-none motion-safe:transition-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:slide-in-from-right"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border p-[var(--spacing-lg)]">
            <Dialog.Title className="font-sans text-[18px] font-semibold text-brand-primary">
              Reassign Review
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-[var(--spacing-xs)] text-brand-secondary transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-accent"
                aria-label="Close panel"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M6 6L14 14M14 6L6 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)]">
              {/* Current assignment info */}
              {review && (
                <div className="mb-[var(--spacing-lg)] rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
                  <p className="font-sans text-[13px] text-brand-secondary">Current reviewer</p>
                  <p className="font-sans text-[14px] font-medium text-brand-primary">
                    {review.reviewerName}
                  </p>
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
                    {review.contributionTitle}
                  </p>
                  <p className="font-sans text-[13px] text-brand-secondary">
                    {review.hoursElapsed.toFixed(1)}h elapsed
                  </p>
                </div>
              )}

              {/* Reviewer selection */}
              <div className="mb-[var(--spacing-lg)]">
                <label
                  htmlFor="reviewer-select"
                  className="mb-[var(--spacing-xs)] block font-sans text-[14px] font-medium text-brand-primary"
                >
                  New Reviewer
                </label>
                {reviewersError ? (
                  <p className="font-sans text-[13px] text-semantic-error">
                    Failed to load eligible reviewers. Please close and try again.
                  </p>
                ) : loadingReviewers ? (
                  <div
                    className="skeleton h-[40px] w-full rounded-[var(--radius-md)]"
                    role="status"
                    aria-label="Loading reviewers"
                  />
                ) : (
                  <select
                    id="reviewer-select"
                    value={selectedReviewerId}
                    onChange={(e) => setSelectedReviewerId(e.target.value)}
                    className="min-h-[40px] w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
                  >
                    <option value="">Select a reviewer...</option>
                    {reviewers.map((reviewer) => {
                      const domainLabel = reviewer.domain;
                      return (
                        <option key={reviewer.id} value={reviewer.id}>
                          {reviewer.name} — {domainLabel} — {reviewer.pendingReviewCount} pending
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Selected reviewer detail */}
              {selectedReviewerId && (
                <div className="mb-[var(--spacing-lg)]">
                  {(() => {
                    const selected = reviewers.find((r) => r.id === selectedReviewerId);
                    if (!selected) return null;
                    const domainColor = DOMAIN_COLORS[selected.domain];
                    return (
                      <div className="flex items-center gap-[var(--spacing-sm)]">
                        <span className="font-sans text-[14px] text-brand-primary">
                          {selected.name}
                        </span>
                        {domainColor && (
                          <span
                            className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium ${domainColor.bg} ${domainColor.text}`}
                          >
                            {selected.domain}
                          </span>
                        )}
                        <span className="font-sans text-[12px] text-brand-secondary">
                          {selected.pendingReviewCount} pending reviews
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Reason textarea */}
              <div>
                <label
                  htmlFor="reassign-reason"
                  className="mb-[var(--spacing-xs)] block font-sans text-[14px] font-medium text-brand-primary"
                >
                  Reason for reassignment
                </label>
                <textarea
                  id="reassign-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this review is being reassigned..."
                  rows={4}
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
                />
                {reason.length > 0 && reason.length < 10 && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-semantic-warning">
                    Minimum 10 characters ({reason.length}/10)
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-[var(--spacing-sm)] border-t border-surface-border p-[var(--spacing-lg)]">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
              >
                {reassign.isPending ? 'Reassigning...' : 'Reassign'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-secondary transition-colors hover:text-brand-primary"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
