'use client';

import { useState } from 'react';
import type { EligibilityCheckDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';
import { ApplicationStatus } from './application-status';

interface EligibilityCardProps {
  check: EligibilityCheckDto;
  onApply: (domain: string, statement: string) => void;
  isSubmitting: boolean;
}

export function EligibilityCard({ check, onApply, isSubmitting }: EligibilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [statement, setStatement] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const domainColor = DOMAIN_COLORS[check.domain] ?? '#6B7B8D';
  const contributionMet = check.current.contributionCount >= check.criteria.minContributionCount;
  const governanceMet = check.current.governanceWeight >= check.criteria.minGovernanceWeight;
  const hasExistingApp = check.existingApplication !== null;
  const appStatus = check.existingApplication?.status;
  const canApply = check.eligible && !hasExistingApp;
  const canReapply =
    check.eligible && hasExistingApp && (appStatus === 'REJECTED' || appStatus === 'REVOKED');

  function handleSubmit() {
    if (statement.length < 20) {
      setValidationError('Application statement must be at least 20 characters');
      return;
    }
    if (statement.length > 300) {
      setValidationError('Application statement must be 300 characters or less');
      return;
    }
    setValidationError(null);
    onApply(check.domain, statement);
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised"
      data-testid={`eligibility-card-${check.domain}`}
    >
      {/* Domain header */}
      <div
        className="px-[var(--spacing-lg)] py-[var(--spacing-md)]"
        style={{ backgroundColor: domainColor }}
      >
        <h3 className="font-sans text-[18px] font-semibold text-surface-raised">{check.domain}</h3>
      </div>

      <div className="px-[var(--spacing-lg)] py-[var(--spacing-md)]">
        {/* Criteria checklist */}
        <div className="space-y-[var(--spacing-sm)]">
          <CriterionRow
            label="Evaluated contributions"
            met={contributionMet}
            current={check.current.contributionCount}
            required={check.criteria.minContributionCount}
          />
          <CriterionRow
            label="Governance weight"
            met={governanceMet}
            current={check.current.governanceWeight}
            required={check.criteria.minGovernanceWeight}
          />
        </div>

        {/* Existing application status */}
        {hasExistingApp && check.existingApplication && (
          <div className="mt-[var(--spacing-md)] border-t border-surface-border pt-[var(--spacing-md)]">
            <ApplicationStatus
              status={check.existingApplication.status}
              reviewedAt={check.existingApplication.reviewedAt}
              reviewNotes={check.existingApplication.reviewNotes}
              createdAt={check.existingApplication.createdAt}
            />
          </div>
        )}

        {/* Apply / Reapply button */}
        {(canApply || canReapply) && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-[var(--spacing-md)] w-full rounded-[var(--radius-md)] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:opacity-90"
            style={{ backgroundColor: domainColor }}
          >
            {canReapply ? 'Reapply as Editor' : 'Apply as Editor'}
          </button>
        )}

        {/* Not eligible message */}
        {!check.eligible && !hasExistingApp && (
          <p className="mt-[var(--spacing-md)] font-sans text-[13px] text-brand-secondary">
            Meet all criteria above to apply as an editor in this domain.
          </p>
        )}

        {/* Application form */}
        {expanded && (
          <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
            <label className="block font-sans text-[14px] font-medium text-brand-primary">
              Why do you want to be an editor?
            </label>
            <textarea
              value={statement}
              onChange={(e) => {
                if (e.target.value.length <= 300) setStatement(e.target.value);
              }}
              rows={3}
              placeholder="Describe your expertise and motivation..."
              className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary outline-none focus:border-brand-accent"
            />
            <div className="flex items-center justify-between">
              <span className="font-sans text-[12px] text-brand-secondary">
                {statement.length} / 300
              </span>
              {validationError && (
                <span className="font-sans text-[12px] text-semantic-error">{validationError}</span>
              )}
            </div>
            <div className="flex gap-[var(--spacing-sm)]">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-[var(--radius-md)] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: domainColor }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <button
                onClick={() => {
                  setExpanded(false);
                  setStatement('');
                  setValidationError(null);
                }}
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CriterionRow({
  label,
  met,
  current,
  required,
}: {
  label: string;
  met: boolean;
  current: number;
  required: number;
}) {
  return (
    <div className="flex items-center gap-[var(--spacing-sm)]">
      <span className="font-sans text-[14px]" style={{ color: met ? '#5A8A6B' : '#6B7B8D' }}>
        {met ? '✓' : '✗'}
      </span>
      <span
        className="font-sans text-[14px]"
        style={{ color: met ? '#5A8A6B' : 'var(--color-brand-secondary, #6B7B8D)' }}
      >
        {label}: {current} / {required} required
      </span>
    </div>
  );
}
