'use client';

import { useState, useRef, useCallback } from 'react';
import type { FieldError } from 'react-hook-form';
import type { MicroTask } from '@edin/shared';
import { DOMAINS } from '@edin/shared';
import { MicroTaskDisplay } from './micro-task-display';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3001' : undefined);

const DOMAIN_OPTIONS = [
  { value: DOMAINS.Technology, label: 'Technology' },
  { value: DOMAINS.Finance, label: 'Finance' },
  { value: DOMAINS.Impact, label: 'Impact' },
  { value: DOMAINS.Governance, label: 'Governance' },
];

interface DomainSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: FieldError;
  name: string;
  inputRef: React.Ref<HTMLSelectElement>;
}

export function DomainSelector({
  value,
  onChange,
  onBlur,
  error,
  name,
  inputRef,
}: DomainSelectorProps) {
  const [microTask, setMicroTask] = useState<MicroTask | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchMicroTask = useCallback((domain: string) => {
    if (!domain || !API_BASE_URL) {
      setMicroTask(null);
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);

    fetch(`${API_BASE_URL}/api/v1/admission/micro-tasks/${domain}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load micro-task');
        return res.json();
      })
      .then((body) => {
        if (fetchId === fetchIdRef.current) {
          setMicroTask(body.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (fetchId === fetchIdRef.current) {
          setMicroTask(null);
          setLoading(false);
        }
      });
  }, []);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      fetchMicroTask(newValue);
    },
    [onChange, fetchMicroTask],
  );

  const displayedMicroTask = value ? microTask : null;

  return (
    <div className="space-y-[var(--spacing-md)]">
      <div>
        <label
          htmlFor={name}
          className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
        >
          Primary Domain
        </label>
        <select
          ref={inputRef}
          id={name}
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          className={`w-full rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
            error ? 'border-semantic-error' : 'border-surface-subtle-input'
          }`}
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={error ? 'true' : undefined}
        >
          <option value="">Select a domain</option>
          {DOMAIN_OPTIONS.map((domain) => (
            <option key={domain.value} value={domain.value}>
              {domain.label}
            </option>
          ))}
        </select>
        {error && (
          <p
            id={`${name}-error`}
            className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
            role="alert"
          >
            {error.message}
          </p>
        )}
      </div>

      {loading && (
        <div
          className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]"
          role="status"
          aria-label="Loading micro-task"
        >
          <div className="space-y-[var(--spacing-sm)]">
            <div className="skeleton h-[24px] w-[60%]" />
            <div className="skeleton h-[16px] w-full" />
            <div className="skeleton h-[16px] w-[90%]" />
            <div className="skeleton h-[16px] w-[70%]" />
          </div>
        </div>
      )}

      {!loading && displayedMicroTask && (
        <div className="space-y-[var(--spacing-sm)]">
          <p className="font-sans text-[13px] font-medium text-text-secondary">
            Show us what you can do
          </p>
          <MicroTaskDisplay microTask={displayedMicroTask} />
        </div>
      )}
    </div>
  );
}
