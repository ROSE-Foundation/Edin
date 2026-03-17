'use client';

import { DOMAIN_COLORS } from '../../../lib/domain-colors';

const DOMAINS = ['Technology', 'Finance', 'Impact', 'Governance'] as const;

interface RosterFiltersProps {
  activeDomain: string | null;
  searchValue: string;
  onDomainChange: (domain: string | null) => void;
  onSearchChange: (search: string) => void;
}

export function RosterFilters({
  activeDomain,
  searchValue,
  onDomainChange,
  onSearchChange,
}: RosterFiltersProps) {
  return (
    <div className="space-y-[var(--spacing-md)]">
      {/* Domain Filter Buttons */}
      <div
        className="flex gap-[var(--spacing-sm)] overflow-x-auto"
        role="group"
        aria-label="Filter by domain"
      >
        <button
          type="button"
          onClick={() => onDomainChange(null)}
          className={`shrink-0 rounded-full px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium transition-colors duration-[var(--transition-fast)] ${
            activeDomain === null
              ? 'bg-accent-primary text-white'
              : 'bg-surface-sunken text-text-secondary hover:bg-surface-border'
          }`}
          aria-pressed={activeDomain === null}
        >
          All
        </button>
        {DOMAINS.map((domain) => {
          const colors = DOMAIN_COLORS[domain];
          const isActive = activeDomain === domain;
          return (
            <button
              key={domain}
              type="button"
              onClick={() => onDomainChange(domain)}
              className={`shrink-0 rounded-full px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium transition-colors duration-[var(--transition-fast)] ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : 'bg-surface-sunken text-text-secondary hover:bg-surface-border'
              }`}
              aria-pressed={isActive}
            >
              {domain}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <label htmlFor="roster-search" className="sr-only">
          Search contributors by name
        </label>
        <svg
          className="absolute top-1/2 left-[var(--spacing-sm)] h-[18px] w-[18px] -translate-y-1/2 text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id="roster-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search contributors by name..."
          className="w-full rounded-[var(--radius-md)] border border-surface-subtle-input bg-surface-raised py-[var(--spacing-sm)] pr-[var(--spacing-md)] pl-[36px] font-sans text-[15px] text-text-primary placeholder:text-text-secondary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
          aria-describedby="roster-search-hint"
        />
        <span id="roster-search-hint" className="sr-only">
          Type a name to filter the contributor list
        </span>
      </div>
    </div>
  );
}
