'use client';

import { useState } from 'react';
import type { ModerationAdminAction } from '@edin/shared';

interface ModerationActionDialogProps {
  action: ModerationAdminAction;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ACTION_LABELS: Record<ModerationAdminAction, string> = {
  DISMISS: 'Dismiss Flag',
  REQUEST_CORRECTIONS: 'Request Corrections',
  REJECT: 'Reject Article',
  UNPUBLISH: 'Unpublish Article',
};

const ACTION_DESCRIPTIONS: Record<ModerationAdminAction, string> = {
  DISMISS:
    'This will dismiss the moderation flag and allow the article to proceed to editorial review.',
  REQUEST_CORRECTIONS:
    'The author will be notified and asked to revise the article before resubmission.',
  REJECT: 'The article will be permanently archived and the author will be notified.',
  UNPUBLISH: 'The article will be removed from public view and archived.',
};

export function ModerationActionDialog({
  action,
  onConfirm,
  onCancel,
  isLoading,
}: ModerationActionDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm ${ACTION_LABELS[action]}`}
    >
      <div className="mx-[var(--spacing-lg)] w-full max-w-[480px] rounded-[var(--radius-lg)] bg-surface-base p-[var(--spacing-xl)] shadow-lg">
        <h2 className="font-serif text-[18px] font-bold text-text-primary">
          {ACTION_LABELS[action]}
        </h2>
        <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-text-secondary">
          {ACTION_DESCRIPTIONS[action]}
        </p>

        <form onSubmit={handleSubmit} className="mt-[var(--spacing-lg)]">
          <label
            htmlFor="moderation-reason"
            className="block font-sans text-[13px] font-medium text-text-primary"
          >
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="moderation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="Provide a clear reason for this action..."
            required
          />

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
              disabled={isLoading || !reason.trim()}
              className={`rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white disabled:opacity-50 ${
                action === 'REJECT' || action === 'UNPUBLISH'
                  ? 'bg-red-600 hover:bg-red-700'
                  : action === 'REQUEST_CORRECTIONS'
                    ? 'bg-[#C49A3C] hover:bg-[#C49A3C]/90'
                    : 'bg-green-600 hover:bg-green-700'
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
