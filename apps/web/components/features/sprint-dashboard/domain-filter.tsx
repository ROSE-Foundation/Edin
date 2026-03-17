'use client';

const DOMAIN_OPTIONS = [
  { value: '', label: 'All domains' },
  { value: 'dev', label: 'Development' },
  { value: 'research', label: 'Research' },
  { value: 'governance', label: 'Governance' },
  { value: 'docs', label: 'Documentation' },
];

interface DomainFilterProps {
  value: string | undefined;
  onChange: (domain: string | undefined) => void;
}

export function DomainFilter({ value, onChange }: DomainFilterProps) {
  return (
    <div className="flex items-center gap-[var(--spacing-sm)]">
      <label htmlFor="domain-filter" className="text-[13px] font-medium text-text-secondary">
        Domain
      </label>
      <select
        id="domain-filter"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      >
        {DOMAIN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
