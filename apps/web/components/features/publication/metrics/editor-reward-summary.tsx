'use client';

import type { EditorRewardSummaryDto } from '@edin/shared';

interface EditorRewardSummaryProps {
  summary: EditorRewardSummaryDto;
}

export function EditorRewardSummary({ summary }: EditorRewardSummaryProps) {
  if (summary.allocations.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
        <h3 className="mb-[var(--spacing-sm)] font-serif text-[1rem] font-semibold text-text-primary">
          Your Editorial Contributions
        </h3>
        <p className="font-sans text-[14px] text-text-secondary">
          No published articles with reward allocations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
      <h3 className="mb-[var(--spacing-md)] font-serif text-[1rem] font-semibold text-text-primary">
        Your Editorial Contributions
      </h3>

      {/* Summary stats */}
      <div className="mb-[var(--spacing-md)] flex gap-[var(--spacing-xl)]">
        <div>
          <p className="font-sans text-[24px] font-bold text-text-primary">
            {summary.totalReviewed}
          </p>
          <p className="font-sans text-[12px] text-text-secondary">Articles reviewed</p>
        </div>
        <div>
          <p className="font-sans text-[24px] font-bold text-text-primary">
            {summary.totalPublished}
          </p>
          <p className="font-sans text-[12px] text-text-secondary">Published</p>
        </div>
        {summary.averageScore !== null && (
          <div>
            <p className="font-sans text-[24px] font-bold text-text-primary">
              {summary.averageScore.toFixed(1)}
            </p>
            <p className="font-sans text-[12px] text-text-secondary">Avg. score</p>
          </div>
        )}
      </div>

      {/* Allocation list */}
      <ul className="space-y-[var(--spacing-sm)]">
        {summary.allocations.map((allocation) => (
          <li
            key={allocation.articleId}
            className="flex items-center justify-between border-t border-surface-subtle/50 pt-[var(--spacing-sm)]"
          >
            <div>
              <p className="font-sans text-[14px] font-medium text-text-primary">
                {allocation.articleTitle}
              </p>
              <p className="font-sans text-[12px] text-text-secondary">
                by {allocation.authorName}
              </p>
            </div>
            <div className="text-right">
              {allocation.compositeScore !== null && (
                <p className="font-sans text-[14px] font-semibold text-text-primary">
                  {allocation.compositeScore.toFixed(1)}
                </p>
              )}
              <p className="font-sans text-[12px] text-text-secondary">
                {allocation.editorSharePercent}% editorial share
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
