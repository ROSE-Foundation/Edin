'use client';

import { useState } from 'react';
import type { AdminTransitionAction } from '@edin/shared';

export const TRANSITION_LABELS: Record<AdminTransitionAction, string> = {
  SUBMIT: 'Submit for Review',
  ASSIGN_EDITOR: 'Assign Editor',
  APPROVE: 'Approve',
  REQUEST_REVISIONS: 'Request Revisions',
  REJECT: 'Reject',
  RESUBMIT: 'Resubmit',
  PUBLISH: 'Publish',
  UNPUBLISH: 'Unpublish',
  MODERATION_DISMISS: 'Dismiss Flag',
  MODERATION_REQUEST_CORRECTIONS: 'Request Corrections',
  MODERATION_REJECT: 'Reject (Moderation)',
};

const DESTRUCTIVE_ACTIONS: AdminTransitionAction[] = ['REJECT', 'UNPUBLISH', 'MODERATION_REJECT'];

const TRANSITION_DESCRIPTIONS: Record<AdminTransitionAction, string> = {
  SUBMIT: 'Force this draft into review on behalf of the author.',
  ASSIGN_EDITOR: 'Run editor assignment now and move the article into editorial review.',
  APPROVE: 'Approve the article on behalf of the assigned editor.',
  REQUEST_REVISIONS: 'Send the article back to the author with revision requests.',
  REJECT: 'Archive the article on behalf of the assigned editor.',
  RESUBMIT: 'Force the article back into review on behalf of the author.',
  PUBLISH: 'Publish this approved article to the public site.',
  UNPUBLISH: 'Remove this published article from public view and archive it.',
  MODERATION_DISMISS: 'Clear the moderation flag and allow the article to proceed to review.',
  MODERATION_REQUEST_CORRECTIONS:
    'Ask the author to correct the flagged article before resubmission.',
  MODERATION_REJECT: 'Archive the flagged article and notify the author.',
};

interface TransitionDialogProps {
  action: AdminTransitionAction;
  articleTitle: string;
  onConfirm: (reason: string, revisionRequests?: { description: string }[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function TransitionDialog({
  action,
  articleTitle,
  onConfirm,
  onCancel,
  isLoading,
}: TransitionDialogProps) {
  const [reason, setReason] = useState('');
  const [revisions, setRevisions] = useState('');
  const requiresRevisions = action === 'REQUEST_REVISIONS';

  const revisionItems = revisions
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((description) => ({ description }));

  const reasonValid = reason.trim().length >= 10;
  const revisionsValid = !requiresRevisions || revisionItems.length > 0;
  const canSubmit = reasonValid && revisionsValid && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(reason.trim(), requiresRevisions ? revisionItems : undefined);
  };

  const isDestructive = DESTRUCTIVE_ACTIONS.includes(action);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm ${TRANSITION_LABELS[action]}`}
    >
      <div className="mx-[var(--spacing-lg)] w-full max-w-[480px] rounded-[var(--radius-lg)] bg-surface-base p-[var(--spacing-xl)] shadow-lg">
        <h2 className="font-serif text-[18px] font-bold text-text-primary">
          {TRANSITION_LABELS[action]}
        </h2>
        <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-text-tertiary">
          {articleTitle}
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] text-text-secondary">
          {TRANSITION_DESCRIPTIONS[action]}
        </p>

        <form onSubmit={handleSubmit} className="mt-[var(--spacing-lg)]">
          {requiresRevisions && (
            <div className="mb-[var(--spacing-lg)]">
              <label
                htmlFor="transition-revisions"
                className="block font-sans text-[13px] font-medium text-text-primary"
              >
                Revision requests <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 font-sans text-[12px] text-text-tertiary">One request per line.</p>
              <textarea
                id="transition-revisions"
                value={revisions}
                onChange={(e) => setRevisions(e.target.value)}
                rows={3}
                className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                placeholder={
                  'Clarify the methodology section\nAdd citations for the claims in section 3'
                }
              />
            </div>
          )}

          <label
            htmlFor="transition-reason"
            className="block font-sans text-[13px] font-medium text-text-primary"
          >
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="transition-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="Explain why you are forcing this transition (min. 10 characters)..."
            required
          />
          {!reasonValid && reason.length > 0 && (
            <p className="mt-1 font-sans text-[12px] text-red-500">
              Reason must be at least 10 characters.
            </p>
          )}

          <div className="mt-[var(--spacing-lg)] flex items-center justify-end gap-[var(--spacing-sm)]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-secondary hover:text-text-primary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white disabled:opacity-50 ${
                isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-accent-primary hover:opacity-90'
              }`}
            >
              {isLoading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
