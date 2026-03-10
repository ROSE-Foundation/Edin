'use client';

import type { EditorRewardSummaryDto } from '@edin/shared';

interface EditorRewardSummaryProps {
  summary: EditorRewardSummaryDto;
}

export function EditorRewardSummary({ summary }: EditorRewardSummaryProps) {
  if (summary.allocations.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <h3 className="mb-[var(--spacing-sm)] font-serif text-[1rem] font-semibold text-brand-primary">
          Your Editorial Contributions
        </h3>
        <p className="font-sans text-[14px] text-brand-secondary">
          No published articles with reward allocations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <h3 className="mb-[var(--spacing-md)] font-serif text-[1rem] font-semibold text-brand-primary">
        Your Editorial Contributions
      </h3>

      {/* Summary stats */}
      <div className="mb-[var(--spacing-md)] flex gap-[var(--spacing-xl)]">
        <div>
          <p className="font-sans text-[24px] font-bold text-brand-primary">
            {summary.totalReviewed}
          </p>
          <p className="font-sans text-[12px] text-brand-secondary">Articles reviewed</p>
        </div>
        <div>
          <p className="font-sans text-[24px] font-bold text-brand-primary">
            {summary.totalPublished}
          </p>
          <p className="font-sans text-[12px] text-brand-secondary">Published</p>
        </div>
        {summary.averageScore !== null && (
          <div>
            <p className="font-sans text-[24px] font-bold text-brand-primary">
              {summary.averageScore.toFixed(1)}
            </p>
            <p className="font-sans text-[12px] text-brand-secondary">Avg. score</p>
          </div>
        )}
      </div>

      {/* Allocation list */}
      <ul className="space-y-[var(--spacing-sm)]">
        {summary.allocations.map((allocation) => (
          <li
            key={allocation.articleId}
            className="flex items-center justify-between border-t border-surface-border/50 pt-[var(--spacing-sm)]"
          >
            <div>
              <p className="font-sans text-[14px] font-medium text-brand-primary">
                {allocation.articleTitle}
              </p>
              <p className="font-sans text-[12px] text-brand-secondary">
                by {allocation.authorName}
              </p>
            </div>
            <div className="text-right">
              {allocation.compositeScore !== null && (
                <p className="font-sans text-[14px] font-semibold text-brand-primary">
                  {allocation.compositeScore.toFixed(1)}
                </p>
              )}
              <p className="font-sans text-[12px] text-brand-secondary">
                {allocation.editorSharePercent}% editorial share
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
