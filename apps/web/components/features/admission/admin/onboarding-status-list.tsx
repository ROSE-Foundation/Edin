'use client';

import { useState } from 'react';
import { useOnboardingStatusList } from '../../../../hooks/use-onboarding-admin';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Fintech: { bg: 'bg-domain-fintech', text: 'text-white' },
  Impact: { bg: 'bg-domain-impact', text: 'text-white' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

const MILESTONE_ORDER = [
  'ACCOUNT_ACTIVATED',
  'BUDDY_ASSIGNED',
  'FIRST_TASK_VIEWED',
  'FIRST_TASK_CLAIMED',
  'FIRST_CONTRIBUTION_SUBMITTED',
] as const;

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function getStatusInfo(status: {
  isAtRisk: boolean;
  isComplete: boolean;
  isExpired: boolean;
  isWithin72Hours: boolean;
}): { label: string; className: string } {
  if (status.isComplete) {
    return { label: 'Completed', className: 'text-green-700 bg-green-50' };
  }
  if (status.isAtRisk) {
    return { label: 'At Risk', className: 'text-amber-700 bg-amber-50' };
  }
  if (status.isExpired) {
    return { label: 'Expired', className: 'text-brand-secondary bg-surface-sunken' };
  }
  return { label: 'In Progress', className: 'text-blue-700 bg-blue-50' };
}

export function OnboardingStatusList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { statuses, isLoading, pagination } = useOnboardingStatusList({
    status: statusFilter || undefined,
  });

  return (
    <div>
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Onboarding Status</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[40px] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] font-sans text-[15px] text-brand-primary"
        >
          <option value="">All statuses</option>
          <option value="at-risk">At Risk</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
        {/* Table header */}
        <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <span className="w-[180px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Contributor
          </span>
          <span className="w-[100px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Domain
          </span>
          <span className="w-[130px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Ignition Started
          </span>
          <span className="w-[130px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Milestones
          </span>
          <span className="w-[110px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Time Elapsed
          </span>
          <span className="w-[90px] font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Status
          </span>
        </div>

        {/* Loading state */}
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center border-b border-surface-border px-[var(--spacing-md)] last:border-b-0"
              style={{ minHeight: '48px' }}
            >
              <div className="w-[180px] skeleton h-[20px]" />
              <div className="w-[100px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
              <div className="w-[130px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[130px] flex items-center gap-[4px] ml-[var(--spacing-sm)]">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="skeleton h-[10px] w-[10px] rounded-full" />
                ))}
              </div>
              <div className="w-[110px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[90px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
            </div>
          ))}

        {/* Data rows */}
        {!isLoading &&
          statuses.map((status) => {
            const statusInfo = getStatusInfo(status);
            const domainColor = status.contributorDomain
              ? DOMAIN_COLORS[status.contributorDomain]
              : null;
            const completedTypes = new Set(status.milestones.map((m) => m.milestoneType));

            return (
              <div
                key={status.contributorId}
                className={`flex items-center border-b border-surface-border px-[var(--spacing-md)] last:border-b-0 ${
                  status.isAtRisk ? 'border-l-[3px] border-l-amber-400' : ''
                }`}
                style={{ minHeight: '48px' }}
              >
                <span className="w-[180px] truncate font-sans text-[15px] text-brand-primary">
                  {status.contributorName}
                </span>
                <span className="w-[100px]">
                  {status.contributorDomain && domainColor ? (
                    <span
                      className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                    >
                      {status.contributorDomain}
                    </span>
                  ) : (
                    <span className="font-sans text-[13px] text-brand-secondary">—</span>
                  )}
                </span>
                <span className="w-[130px] font-sans text-[13px] text-brand-secondary">
                  {status.ignitionStartedAt ? formatRelativeDate(status.ignitionStartedAt) : '—'}
                </span>
                <span className="w-[130px]">
                  <div className="flex items-center gap-[4px]">
                    {MILESTONE_ORDER.map((type) => (
                      <div
                        key={type}
                        className={`h-[10px] w-[10px] rounded-full ${
                          completedTypes.has(type)
                            ? 'bg-brand-accent'
                            : 'border-2 border-surface-border'
                        }`}
                        title={type.replace(/_/g, ' ').toLowerCase()}
                      />
                    ))}
                  </div>
                </span>
                <span className="w-[110px] font-sans text-[13px] text-brand-secondary">
                  {status.hoursElapsed !== null
                    ? status.hoursElapsed < 24
                      ? `${Math.round(status.hoursElapsed)}h`
                      : `${Math.round(status.hoursElapsed / 24)}d ${Math.round(status.hoursElapsed % 24)}h`
                    : '—'}
                </span>
                <span className="w-[90px]">
                  <span
                    className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </span>
              </div>
            );
          })}

        {/* Empty state */}
        {!isLoading && statuses.length === 0 && (
          <div className="px-[var(--spacing-md)] py-[var(--spacing-2xl)] text-center">
            <p className="font-serif text-[15px] text-brand-secondary">
              No onboarding records found.
            </p>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {pagination && (
        <div className="mt-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
          Showing {statuses.length} of {pagination.total} contributors
        </div>
      )}
    </div>
  );
}
