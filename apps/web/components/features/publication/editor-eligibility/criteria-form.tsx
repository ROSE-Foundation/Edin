'use client';

import { useState } from 'react';
import type { EditorEligibilityCriteriaDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';

interface CriteriaFormProps {
  criteria: EditorEligibilityCriteriaDto;
  onSave: (
    domain: string,
    data: {
      minContributionCount?: number;
      minGovernanceWeight?: number;
      maxConcurrentAssignments?: number;
    },
  ) => void;
  isSaving: boolean;
}

export function CriteriaForm({ criteria, onSave, isSaving }: CriteriaFormProps) {
  const [minContributions, setMinContributions] = useState(criteria.minContributionCount);
  const [minGovernance, setMinGovernance] = useState(criteria.minGovernanceWeight);
  const [maxAssignments, setMaxAssignments] = useState(criteria.maxConcurrentAssignments);
  const domainColor = DOMAIN_COLORS[criteria.domain] ?? '#6B7B8D';

  const hasChanges =
    minContributions !== criteria.minContributionCount ||
    minGovernance !== criteria.minGovernanceWeight ||
    maxAssignments !== criteria.maxConcurrentAssignments;

  function handleSave() {
    const data: {
      minContributionCount?: number;
      minGovernanceWeight?: number;
      maxConcurrentAssignments?: number;
    } = {};
    if (minContributions !== criteria.minContributionCount)
      data.minContributionCount = minContributions;
    if (minGovernance !== criteria.minGovernanceWeight) data.minGovernanceWeight = minGovernance;
    if (maxAssignments !== criteria.maxConcurrentAssignments)
      data.maxConcurrentAssignments = maxAssignments;
    onSave(criteria.domain, data);
  }

  return (
    <div
      className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]"
      data-testid={`criteria-form-${criteria.domain}`}
    >
      <div className="mb-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)]">
        <div className="h-[12px] w-[12px] rounded-full" style={{ backgroundColor: domainColor }} />
        <h4 className="font-sans text-[16px] font-semibold text-text-primary">{criteria.domain}</h4>
      </div>

      <div className="space-y-[var(--spacing-md)]">
        <div>
          <label className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-text-secondary">
            Min. evaluated contributions
          </label>
          <input
            type="number"
            min={1}
            value={minContributions}
            onChange={(e) => setMinContributions(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary outline-none focus:border-accent-primary"
          />
        </div>

        <div>
          <label className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-text-secondary">
            Min. governance weight
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={minGovernance}
            onChange={(e) => setMinGovernance(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary outline-none focus:border-accent-primary"
          />
          <span className="mt-[var(--spacing-xs)] block font-sans text-[11px] text-text-secondary">
            Governance weight tracking coming in Phase 2
          </span>
        </div>

        <div>
          <label className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-text-secondary">
            Max concurrent assignments
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxAssignments}
            onChange={(e) =>
              setMaxAssignments(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))
            }
            className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-surface-raised transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
