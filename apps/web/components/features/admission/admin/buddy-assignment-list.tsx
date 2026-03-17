'use client';

import { useState } from 'react';
import { useBuddyAssignmentList } from '../../../../hooks/use-buddy-admin';
import { BuddyOverrideDialog } from './buddy-override-dialog';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Finance: { bg: 'bg-domain-finance', text: 'text-white' },
  Impact: { bg: 'bg-domain-impact', text: 'text-white' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatus(isActive: boolean, expiresAt: string): { label: string; className: string } {
  if (!isActive) {
    return { label: 'Inactive', className: 'text-text-secondary bg-surface-sunken' };
  }
  if (new Date() > new Date(expiresAt)) {
    return { label: 'Completed', className: 'text-accent-primary bg-accent-primary/10' };
  }
  return { label: 'Active', className: 'text-green-700 bg-green-50' };
}

export function BuddyAssignmentList() {
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [overrideAssignment, setOverrideAssignment] = useState<{
    id: string;
    contributorName: string;
  } | null>(null);

  const { assignments, isLoading, pagination } = useBuddyAssignmentList({
    domain: domainFilter || undefined,
  });

  return (
    <div>
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <h1 className="font-serif text-[28px] font-bold text-text-primary">Buddy Assignments</h1>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="min-h-[40px] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] font-sans text-[15px] text-text-primary"
        >
          <option value="">All domains</option>
          <option value="Technology">Technology</option>
          <option value="Finance">Finance</option>
          <option value="Impact">Impact</option>
          <option value="Governance">Governance</option>
        </select>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised">
        {/* Table header */}
        <div className="flex border-b border-surface-subtle px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <span className="w-[180px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Contributor
          </span>
          <span className="w-[180px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Buddy
          </span>
          <span className="w-[100px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Domain
          </span>
          <span className="w-[110px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Assigned
          </span>
          <span className="w-[110px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Expires
          </span>
          <span className="w-[90px] font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Status
          </span>
          <span className="ml-auto w-[80px]" />
        </div>

        {/* Loading state */}
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center border-b border-surface-subtle px-[var(--spacing-md)] last:border-b-0"
              style={{ minHeight: '48px' }}
            >
              <div className="w-[180px] skeleton h-[20px]" />
              <div className="w-[180px] skeleton h-[20px] ml-[var(--spacing-sm)]" />
              <div className="w-[100px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
              <div className="w-[110px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[110px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[90px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
            </div>
          ))}

        {/* Data rows */}
        {!isLoading &&
          assignments.map((assignment) => {
            const status = getStatus(assignment.isActive, assignment.expiresAt);
            const contributorDomain = assignment.contributor?.domain;
            const domainColor = contributorDomain ? DOMAIN_COLORS[contributorDomain] : null;

            return (
              <div
                key={assignment.id}
                className="flex items-center border-b border-surface-subtle px-[var(--spacing-md)] last:border-b-0"
                style={{ minHeight: '48px' }}
              >
                <span className="w-[180px] truncate font-sans text-[15px] text-text-primary">
                  {assignment.contributor?.name ?? 'Unknown'}
                </span>
                <span className="w-[180px] truncate font-sans text-[15px] text-text-primary">
                  {assignment.buddy?.name ?? 'Unknown'}
                </span>
                <span className="w-[100px]">
                  {contributorDomain && domainColor ? (
                    <span
                      className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                    >
                      {contributorDomain}
                    </span>
                  ) : (
                    <span className="font-sans text-[13px] text-text-secondary">—</span>
                  )}
                </span>
                <span className="w-[110px] font-sans text-[13px] text-text-secondary">
                  {formatDate(assignment.assignedAt)}
                </span>
                <span className="w-[110px] font-sans text-[13px] text-text-secondary">
                  {formatDate(assignment.expiresAt)}
                </span>
                <span className="w-[90px]">
                  <span
                    className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </span>
                <span className="ml-auto w-[80px] text-right">
                  {assignment.isActive && (
                    <button
                      onClick={() =>
                        setOverrideAssignment({
                          id: assignment.id,
                          contributorName: assignment.contributor?.name ?? 'contributor',
                        })
                      }
                      className="rounded-[var(--radius-sm)] border border-surface-subtle px-[var(--spacing-sm)] py-[4px] font-sans text-[13px] text-text-secondary transition-colors hover:bg-surface-sunken"
                    >
                      Override
                    </button>
                  )}
                </span>
              </div>
            );
          })}

        {/* Empty state */}
        {!isLoading && assignments.length === 0 && (
          <div className="px-[var(--spacing-md)] py-[var(--spacing-2xl)] text-center">
            <p className="font-serif text-[15px] text-text-secondary">
              No buddy assignments found.
            </p>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {pagination && (
        <div className="mt-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
          Showing {assignments.length} of {pagination.total} assignments
        </div>
      )}

      {/* Override dialog */}
      {overrideAssignment && (
        <BuddyOverrideDialog
          assignmentId={overrideAssignment.id}
          contributorName={overrideAssignment.contributorName}
          onClose={() => setOverrideAssignment(null)}
        />
      )}
    </div>
  );
}
