'use client';

import type { FieldError } from 'react-hook-form';

interface GdprConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  error?: FieldError;
  name: string;
  inputRef: React.Ref<HTMLInputElement>;
}

export function GdprConsent({
  checked,
  onChange,
  onBlur,
  error,
  name,
  inputRef,
}: GdprConsentProps) {
  return (
    <div className="space-y-[var(--spacing-sm)]">
      <div className="flex items-start gap-[var(--spacing-sm)]">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          className="mt-[4px] h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-surface-subtle-input accent-accent-primary focus:ring-2 focus:ring-accent-primary focus:outline-none"
          aria-describedby={error ? `${name}-error` : `${name}-description`}
          aria-invalid={error ? 'true' : undefined}
        />
        <label
          htmlFor={name}
          id={`${name}-description`}
          className="cursor-pointer font-sans text-[13px] leading-[1.5] text-text-secondary"
        >
          I agree to the processing of my personal data in accordance with the{' '}
          <span className="font-medium text-text-primary underline">Data Processing Agreement</span>{' '}
          (Version 1.0). My data will be used solely for the purpose of evaluating my application
          and, if approved, managing my contributor account. I understand that I can request
          deletion of my data at any time.
        </label>
      </div>
      {error && (
        <p id={`${name}-error`} className="font-sans text-[13px] text-semantic-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
