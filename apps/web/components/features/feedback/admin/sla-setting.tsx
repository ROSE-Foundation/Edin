'use client';

import { useState } from 'react';
import { useFeedbackSla, useUpdateFeedbackSla } from '../../../../hooks/use-feedback-monitoring';

export function SlaSetting() {
  const { hours, isLoading } = useFeedbackSla();
  const updateSla = useUpdateFeedbackSla();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState('');

  function handleEdit() {
    setValue(String(hours));
    setEditing(true);
    setValidationError('');
  }

  function handleCancel() {
    setEditing(false);
    setValidationError('');
  }

  function handleSave() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      setValidationError('Must be at least 1 hour.');
      return;
    }
    if (parsed > 720) {
      setValidationError('Cannot exceed 720 hours (30 days).');
      return;
    }
    setValidationError('');
    updateSla.mutate({ hours: parsed }, { onSuccess: () => setEditing(false) });
  }

  if (isLoading) {
    return (
      <div
        className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
        role="status"
        aria-label="Loading SLA setting"
      >
        <div className="skeleton h-[20px] w-[200px]" />
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <div className="flex items-center gap-[var(--spacing-md)]">
        <span className="font-sans text-[14px] font-medium text-brand-primary">Turnaround SLA</span>
        {editing ? (
          <div className="flex items-center gap-[var(--spacing-sm)]">
            <input
              type="number"
              min={1}
              max={720}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[40px] w-[100px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
              aria-label="SLA hours"
            />
            <span className="font-sans text-[14px] text-brand-secondary">hours</span>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateSla.isPending}
              className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-white transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-brand-secondary transition-colors hover:text-brand-primary"
            >
              Cancel
            </button>
            {validationError && (
              <p className="font-sans text-[12px] text-semantic-error">{validationError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-[var(--spacing-sm)]">
            <span className="font-sans text-[15px] font-semibold text-brand-primary">
              {hours} hours
            </span>
            <button
              type="button"
              onClick={handleEdit}
              className="font-sans text-[13px] font-medium text-brand-accent transition-colors hover:text-brand-accent/80"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
