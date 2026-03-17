'use client';

import type { ScopeChangeRecord } from '@edin/shared';

interface ScopeChangesTableProps {
  data: ScopeChangeRecord[];
}

export function ScopeChangesTable({ data }: ScopeChangesTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-[14px] text-text-tertiary">No scope changes recorded for this sprint.</p>
    );
  }

  return (
    <table className="w-full text-left font-sans text-[14px]" aria-label="Sprint scope changes">
      <thead>
        <tr className="border-b border-surface-subtle">
          <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Issue</th>
          <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Change</th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            Points
          </th>
          <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
            When
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-surface-subtle/50">
            <td className="py-[var(--spacing-sm)] text-text-primary">#{item.issueNumber}</td>
            <td className="py-[var(--spacing-sm)]">
              {item.changeType === 'ADDED' ? (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <span aria-hidden="true">+</span>
                  <span>Added</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <span aria-hidden="true">{'\u2212'}</span>
                  <span>Removed</span>
                </span>
              )}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {item.storyPoints ?? '\u2014'}
            </td>
            <td className="py-[var(--spacing-sm)] text-right text-text-primary">
              {new Date(item.changedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
