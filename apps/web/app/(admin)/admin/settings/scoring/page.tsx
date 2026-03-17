'use client';

import { FormulaEditor } from '../../../../../components/features/reward/admin/formula-editor';
import { FormulaHistory } from '../../../../../components/features/reward/admin/formula-history';

export default function AdminScoringSettingsPage() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-text-primary">
        Scoring Formula Settings
      </h1>

      {/* Create New Formula */}
      <section className="mb-[var(--spacing-xl)]">
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-text-primary">
          Formula Configuration
        </h2>
        <FormulaEditor />
      </section>

      {/* Formula History */}
      <section>
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-text-primary">
          Version History
        </h2>
        <FormulaHistory />
      </section>
    </div>
  );
}
