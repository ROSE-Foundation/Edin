'use client';

import type { DomainHealthIndicators } from '@edin/shared';

interface DomainHealthCardProps {
  healthIndicators: DomainHealthIndicators;
}

export function DomainHealthCard({ healthIndicators }: DomainHealthCardProps) {
  return (
    <section role="region" aria-label="Domain Health">
      <h3 className="font-sans text-[16px] font-medium text-text-primary">Domain Health</h3>
      <div className="mt-[var(--spacing-md)] grid grid-cols-3 gap-[var(--spacing-md)]">
        <div className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-card">
          <p className="font-sans text-2xl font-bold text-text-primary">
            {healthIndicators.activeMembers}
          </p>
          <p className="mt-[var(--spacing-xs)] font-sans text-sm text-text-secondary">
            Active Members
          </p>
        </div>
        <div className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-card">
          <p className="font-sans text-2xl font-bold text-text-primary">
            {healthIndicators.contributionVelocity}
          </p>
          <p className="mt-[var(--spacing-xs)] font-sans text-sm text-text-secondary">
            Weekly Contributions
          </p>
        </div>
        <div className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-card">
          <p className="font-sans text-2xl font-bold text-text-primary">
            {healthIndicators.totalContributions}
          </p>
          <p className="mt-[var(--spacing-xs)] font-sans text-sm text-text-secondary">
            Total Contributions
          </p>
        </div>
      </div>
    </section>
  );
}
