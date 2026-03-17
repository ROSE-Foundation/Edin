'use client';

import type { ArticleVersionDto } from '@edin/shared';

interface VersionSelectorProps {
  versions: ArticleVersionDto[];
  currentVersion: number;
  selectedVersion: number | null;
  onSelectVersion: (version: number | null) => void;
}

export function VersionSelector({
  versions,
  currentVersion,
  selectedVersion,
  onSelectVersion,
}: VersionSelectorProps) {
  if (versions.length === 0) return null;

  return (
    <div className="flex items-center gap-[var(--spacing-sm)]">
      <label className="font-sans text-[13px] font-medium text-text-secondary">Version:</label>
      <select
        value={selectedVersion ?? 'current'}
        onChange={(e) => {
          const val = e.target.value;
          onSelectVersion(val === 'current' ? null : parseInt(val, 10));
        }}
        className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] text-text-primary outline-none focus:border-accent-primary"
        aria-label="Select article version"
      >
        <option value="current">Current (v{currentVersion})</option>
        {versions
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .map((v) => {
            const date = new Date(v.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <option key={v.versionNumber} value={v.versionNumber}>
                v{v.versionNumber} - {date}
              </option>
            );
          })}
      </select>
      {selectedVersion !== null && (
        <span className="font-sans text-[12px] text-text-secondary">(read-only)</span>
      )}
    </div>
  );
}
