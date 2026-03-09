'use client';

import { useState } from 'react';
import type { EditorialDecision, EditorialFeedbackInput } from '@edin/shared';

interface EditorialFeedbackFormProps {
  onSubmit: (data: EditorialFeedbackInput) => void;
  isSubmitting: boolean;
}

const DECISION_OPTIONS: {
  value: EditorialDecision;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'APPROVE',
    label: 'Approve',
    description: 'This article is ready for publication',
    icon: '\u2713',
  },
  {
    value: 'REQUEST_REVISIONS',
    label: 'Request Revisions',
    description: 'The author should address specific feedback',
    icon: '\u270E',
  },
  {
    value: 'REJECT',
    label: 'Reject',
    description: 'This article does not meet editorial standards',
    icon: '\u2717',
  },
];

export function EditorialFeedbackForm({ onSubmit, isSubmitting }: EditorialFeedbackFormProps) {
  const [decision, setDecision] = useState<EditorialDecision | null>(null);
  const [overallAssessment, setOverallAssessment] = useState('');
  const [revisionRequests, setRevisionRequests] = useState<{ description: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addRevisionRequest = () => {
    setRevisionRequests((prev) => [...prev, { description: '' }]);
  };

  const removeRevisionRequest = (index: number) => {
    setRevisionRequests((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRevisionRequest = (index: number, description: string) => {
    setRevisionRequests((prev) => prev.map((r, i) => (i === index ? { description } : r)));
  };

  const handleSubmit = () => {
    setError(null);

    if (!decision) {
      setError('Please select a decision');
      return;
    }

    if (overallAssessment.length < 10) {
      setError('Overall assessment must be at least 10 characters');
      return;
    }

    if (decision === 'REQUEST_REVISIONS' && revisionRequests.length === 0) {
      setError('At least one revision request is required when requesting revisions');
      return;
    }

    const emptyRequests = revisionRequests.some((r) => !r.description.trim());
    if (emptyRequests) {
      setError('All revision requests must have a description');
      return;
    }

    onSubmit({
      decision,
      overallAssessment,
      revisionRequests: decision === 'REQUEST_REVISIONS' ? revisionRequests : [],
      inlineComments: [],
    });
  };

  const submitLabel =
    decision === 'APPROVE'
      ? 'Approve Article'
      : decision === 'REQUEST_REVISIONS'
        ? 'Request Revisions'
        : decision === 'REJECT'
          ? 'Reject Article'
          : 'Submit Feedback';

  return (
    <div className="flex flex-col gap-[var(--spacing-lg)]">
      {/* Decision selector */}
      <div>
        <label className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-brand-secondary">
          Decision
        </label>
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          {DECISION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDecision(option.value)}
              className="flex items-start gap-[var(--spacing-md)] rounded-[var(--radius-md)] border p-[var(--spacing-md)] text-left transition-colors"
              style={{
                borderColor:
                  decision === option.value
                    ? 'var(--color-brand-accent, #C4956A)'
                    : 'var(--color-surface-border, #E8E6E1)',
                backgroundColor:
                  decision === option.value
                    ? 'var(--color-surface-sunken, #F2F0EB)'
                    : 'transparent',
              }}
            >
              <span className="mt-[2px] font-sans text-[18px]">{option.icon}</span>
              <div>
                <span className="block font-sans text-[15px] font-semibold text-brand-primary">
                  {option.label}
                </span>
                <span className="block font-sans text-[13px] text-brand-secondary">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Overall assessment */}
      <div>
        <label className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-brand-secondary">
          Overall Assessment
        </label>
        <textarea
          value={overallAssessment}
          onChange={(e) => setOverallAssessment(e.target.value)}
          placeholder="Provide your overall assessment of the article..."
          rows={4}
          className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none focus:border-brand-accent"
        />
      </div>

      {/* Revision requests */}
      {decision === 'REQUEST_REVISIONS' && (
        <div>
          <label className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-brand-secondary">
            Revision Requests
          </label>
          <div className="flex flex-col gap-[var(--spacing-sm)]">
            {revisionRequests.map((req, index) => (
              <div key={index} className="flex gap-[var(--spacing-sm)]">
                <textarea
                  value={req.description}
                  onChange={(e) => updateRevisionRequest(index, e.target.value)}
                  placeholder={`Revision request #${index + 1}`}
                  rows={2}
                  className="flex-1 resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary outline-none focus:border-brand-accent"
                />
                <button
                  type="button"
                  onClick={() => removeRevisionRequest(index)}
                  className="self-start rounded-[var(--radius-md)] px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[14px] text-semantic-error transition-colors hover:bg-surface-sunken"
                  aria-label={`Remove revision request ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRevisionRequest}
              className="self-start rounded-[var(--radius-md)] border border-dashed border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary transition-colors hover:border-brand-accent hover:text-brand-accent"
            >
              + Add revision request
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && <p className="font-sans text-[14px] text-semantic-error">{error}</p>}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !decision}
        className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </div>
  );
}
