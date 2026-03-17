'use client';

import { useState } from 'react';
import type { EditorApplicationDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';

interface ApplicationReviewCardProps {
  application: EditorApplicationDto;
  onReview: (applicationId: string, decision: string, reviewNotes?: string) => void;
  isSubmitting: boolean;
}

export function ApplicationReviewCard({
  application,
  onReview,
  isSubmitting,
}: ApplicationReviewCardProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const domainColor = DOMAIN_COLORS[application.domain] ?? '#6B7B8D';

  function handleSubmitReview() {
    if (!reviewAction) return;
    onReview(application.id, reviewAction, reviewNotes || undefined);
    setShowReviewForm(false);
    setReviewAction(null);
    setReviewNotes('');
  }

  return (
    <div
      className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]"
      data-testid={`review-card-${application.id}`}
    >
      <div className="flex items-start justify-between gap-[var(--spacing-md)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--spacing-sm)]">
            {application.contributorAvatarUrl && (
              <img
                src={application.contributorAvatarUrl}
                alt=""
                className="h-[32px] w-[32px] rounded-full"
              />
            )}
            <div>
              <h4 className="font-sans text-[15px] font-semibold text-text-primary">
                {application.contributorName}
              </h4>
              <span className="font-sans text-[12px] text-text-secondary">
                Applied{' '}
                {new Date(application.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-surface-raised"
          style={{ backgroundColor: domainColor }}
        >
          {application.domain}
        </span>
      </div>

      <p className="mt-[var(--spacing-md)] font-sans text-[14px] text-text-primary">
        {application.applicationStatement}
      </p>

      {!showReviewForm ? (
        <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
          <button
            onClick={() => {
              setShowReviewForm(true);
              setReviewAction('APPROVED');
            }}
            className="rounded-[var(--radius-md)] bg-[#5A8A6B] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-surface-raised transition-colors hover:opacity-90"
          >
            Approve
          </button>
          <button
            onClick={() => {
              setShowReviewForm(true);
              setReviewAction('REJECTED');
            }}
            className="rounded-[var(--radius-md)] bg-[#A85A5A] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-surface-raised transition-colors hover:opacity-90"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
          <label className="block font-sans text-[14px] font-medium text-text-primary">
            {reviewAction === 'REJECTED' ? 'Reason for rejection' : 'Review notes (optional)'}
          </label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            placeholder={
              reviewAction === 'REJECTED' ? 'Provide reason for rejection...' : 'Optional notes...'
            }
            className="w-full resize-none rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary outline-none focus:border-accent-primary"
          />
          <div className="flex gap-[var(--spacing-sm)]">
            <button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="rounded-[var(--radius-md)] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-surface-raised transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: reviewAction === 'APPROVED' ? '#5A8A6B' : '#A85A5A' }}
            >
              {isSubmitting
                ? 'Submitting...'
                : `Confirm ${reviewAction === 'APPROVED' ? 'Approval' : 'Rejection'}`}
            </button>
            <button
              onClick={() => {
                setShowReviewForm(false);
                setReviewAction(null);
                setReviewNotes('');
              }}
              className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-secondary transition-colors hover:bg-surface-sunken"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
