'use client';

import { useMyScores } from '../../../../hooks/use-scores';
import { ScoresSummaryCard } from '../../../../components/features/reward/scores-summary-card';
import { TemporalHorizonsPanel } from '../../../../components/features/reward/temporal-horizons-panel';
import { ScoreProvenanceDetail } from '../../../../components/features/reward/score-provenance-detail';

export default function DashboardScoresPage() {
  const { summary, isLoading, error } = useMyScores();

  if (isLoading) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-text-primary">
          Contribution Scores
        </h1>
        <p className="font-sans text-[14px] text-neutral-400">Loading scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-text-primary">
          Contribution Scores
        </h1>
        <p className="font-sans text-[14px] text-red-500">
          Failed to load scores. Please try again later.
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-text-primary">
          Contribution Scores
        </h1>
        <p className="font-sans text-[14px] text-neutral-400">
          No scores available yet. Scores will appear after your contributions are evaluated.
        </p>
      </div>
    );
  }

  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-text-primary">
        Contribution Scores
      </h1>

      {/* Summary Card */}
      <section className="mb-[var(--spacing-lg)]">
        <ScoresSummaryCard summary={summary} />
      </section>

      {/* Temporal Horizons */}
      <section className="mb-[var(--spacing-lg)]">
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-text-primary">
          Score Horizons
        </h2>
        <TemporalHorizonsPanel aggregates={summary.aggregates} />
      </section>

      {/* Recent Scores with Provenance */}
      <section>
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-text-primary">
          Recent Scores
        </h2>
        <ScoreProvenanceDetail scores={summary.recentScores} />
      </section>
    </div>
  );
}
