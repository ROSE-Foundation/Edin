'use client';

import { FlaggedArticlesTable } from './flagged-articles-table';

export function ModerationDashboard() {
  return (
    <div className="space-y-[var(--spacing-xl)]">
      <FlaggedArticlesTable />
    </div>
  );
}
