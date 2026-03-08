'use client';

import { useMemo, useState } from 'react';
import * as Select from '@radix-ui/react-select';

const DOMAIN_OPTIONS = ['Technology', 'Fintech', 'Impact', 'Governance'];
const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

interface CreateTaskFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  }) => void;
  isPending: boolean;
  initialValues?: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  };
  submitLabel?: string;
  heading?: string;
  onCancel?: () => void;
}

export function CreateTaskForm({
  onSubmit,
  isPending,
  initialValues,
  submitLabel = 'Create Task',
  heading = 'Create New Task',
  onCancel,
}: CreateTaskFormProps) {
  const defaults = useMemo(
    () => ({
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      domain: initialValues?.domain ?? 'Technology',
      difficulty: initialValues?.difficulty ?? 'BEGINNER',
      estimatedEffort: initialValues?.estimatedEffort ?? '',
    }),
    [initialValues],
  );

  const [title, setTitle] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [domain, setDomain] = useState(defaults.domain);
  const [difficulty, setDifficulty] = useState(defaults.difficulty);
  const [estimatedEffort, setEstimatedEffort] = useState(defaults.estimatedEffort);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, domain, difficulty, estimatedEffort });

    if (!initialValues) {
      setTitle('');
      setDescription('');
      setEstimatedEffort('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
    >
      <h2 className="font-sans text-[18px] font-medium text-brand-primary">{heading}</h2>

      <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-lg)]">
        <div>
          <label
            htmlFor="task-title"
            className="block font-sans text-[14px] font-medium text-brand-primary"
          >
            Title
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="mt-[var(--spacing-xs)] min-h-[44px] w-full rounded-[8px] border border-surface-border bg-surface-base px-[var(--spacing-md)] font-sans text-[14px] text-brand-primary"
            placeholder="Task title"
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="block font-sans text-[14px] font-medium text-brand-primary"
          >
            Description
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="mt-[var(--spacing-xs)] w-full rounded-[8px] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
            placeholder="Task description (supports markdown)"
          />
        </div>

        <div>
          <label
            htmlFor="task-domain"
            className="block font-sans text-[14px] font-medium text-brand-primary"
          >
            Domain
          </label>
          <div className="mt-[var(--spacing-xs)]">
            <SelectField
              value={domain}
              ariaLabel="Task domain"
              options={DOMAIN_OPTIONS.map((value) => ({ value, label: value }))}
              onValueChange={setDomain}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="task-difficulty"
            className="block font-sans text-[14px] font-medium text-brand-primary"
          >
            Difficulty
          </label>
          <div className="mt-[var(--spacing-xs)]">
            <SelectField
              value={difficulty}
              ariaLabel="Task difficulty"
              options={DIFFICULTY_OPTIONS}
              onValueChange={setDifficulty}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="task-effort"
            className="block font-sans text-[14px] font-medium text-brand-primary"
          >
            Estimated Effort
          </label>
          <input
            id="task-effort"
            type="text"
            value={estimatedEffort}
            onChange={(e) => setEstimatedEffort(e.target.value)}
            required
            className="mt-[var(--spacing-xs)] min-h-[44px] w-full rounded-[8px] border border-surface-border bg-surface-base px-[var(--spacing-md)] font-sans text-[14px] text-brand-primary"
            placeholder="e.g., 2-4 hours"
          />
        </div>

        <div className="flex flex-wrap gap-[var(--spacing-sm)]">
          <button
            type="submit"
            disabled={isPending || !title || !description || !estimatedEffort}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] bg-brand-accent px-[var(--spacing-lg)] font-sans text-[14px] font-medium text-white transition-colors duration-200 hover:bg-brand-accent/90 disabled:opacity-50 motion-reduce:transition-none"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[8px] border border-surface-border px-[var(--spacing-lg)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-200 hover:bg-surface-sunken motion-reduce:transition-none"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function SelectField({
  value,
  options,
  ariaLabel,
  onValueChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        className="flex min-h-[44px] w-full items-center justify-between rounded-[8px] border border-surface-border bg-surface-base px-[var(--spacing-md)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        aria-label={ariaLabel}
      >
        <Select.Value />
        <Select.Icon className="ml-[var(--spacing-xs)] text-brand-secondary">
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-50 overflow-hidden rounded-[12px] border border-surface-border bg-surface-raised shadow-[var(--shadow-modal)]"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-[var(--spacing-xs)]">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="flex min-h-[36px] cursor-pointer items-center rounded-[8px] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
