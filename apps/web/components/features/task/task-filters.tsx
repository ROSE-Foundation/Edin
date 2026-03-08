'use client';

import * as Select from '@radix-ui/react-select';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'];
const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];
const STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'EVALUATED', label: 'Evaluated' },
  { value: 'RETIRED', label: 'Retired' },
];

interface TaskFiltersProps {
  domain: string;
  difficulty: string;
  status: string;
  onDomainChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function TaskFilters({
  domain,
  difficulty,
  status,
  onDomainChange,
  onDifficultyChange,
  onStatusChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-[var(--spacing-sm)]">
      <TaskFilterSelect
        label="Filter by domain"
        value={domain}
        placeholder="All Domains"
        allLabel="All Domains"
        options={DOMAINS.map((value) => ({ value, label: value }))}
        onChange={onDomainChange}
      />

      <TaskFilterSelect
        label="Filter by difficulty"
        value={difficulty}
        placeholder="All Difficulties"
        allLabel="All Difficulties"
        options={DIFFICULTIES}
        onChange={onDifficultyChange}
      />

      <TaskFilterSelect
        label="Filter by status"
        value={status}
        placeholder="All Statuses"
        allLabel="All Statuses"
        options={STATUSES}
        onChange={onStatusChange}
      />
    </div>
  );
}

function TaskFilterSelect({
  label,
  value,
  placeholder,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root
      value={value || 'all'}
      onValueChange={(nextValue) => onChange(nextValue === 'all' ? '' : nextValue)}
    >
      <Select.Trigger
        className="flex min-h-[44px] min-w-[170px] items-center justify-between rounded-[12px] border border-surface-border bg-surface-raised px-[var(--spacing-md)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        aria-label={label}
      >
        <Select.Value placeholder={placeholder} />
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
            <Select.Item
              value="all"
              className="flex min-h-[36px] cursor-pointer items-center rounded-[8px] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
            >
              <Select.ItemText>{allLabel}</Select.ItemText>
            </Select.Item>
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
