'use client';

import type { ArticleRewardAllocationDto } from '@edin/shared';

interface RewardSplitBadgeProps {
  allocation: ArticleRewardAllocationDto;
  compact?: boolean;
}

export function RewardSplitBadge({ allocation, compact = false }: RewardSplitBadgeProps) {
  if (compact) {
    return (
      <span className="font-sans text-[12px] text-brand-secondary">
        {allocation.compositeScore !== null && (
          <span className="mr-[var(--spacing-xs)] font-medium text-brand-primary">
            Score: {allocation.compositeScore.toFixed(1)}
          </span>
        )}
        Author: {allocation.authorSharePercent}%
        {allocation.editorName && ` / Editor: ${allocation.editorSharePercent}%`}
      </span>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <h3 className="mb-[var(--spacing-sm)] font-serif text-[1rem] font-semibold text-brand-primary">
        Reward Split
      </h3>
      <div className="flex items-center gap-[var(--spacing-xl)]">
        <div>
          <p className="font-sans text-[13px] text-brand-secondary">Author</p>
          <p className="font-sans text-[20px] font-bold text-brand-primary">
            {allocation.authorSharePercent}%
          </p>
          <p className="font-sans text-[13px] text-brand-secondary">{allocation.authorName}</p>
        </div>
        {allocation.editorName && (
          <>
            <div className="h-12 w-px bg-surface-border" />
            <div>
              <p className="font-sans text-[13px] text-brand-secondary">Editor</p>
              <p className="font-sans text-[20px] font-bold text-brand-primary">
                {allocation.editorSharePercent}%
              </p>
              <p className="font-sans text-[13px] text-brand-secondary">{allocation.editorName}</p>
            </div>
          </>
        )}
        {allocation.compositeScore !== null && (
          <>
            <div className="h-12 w-px bg-surface-border" />
            <div>
              <p className="font-sans text-[13px] text-brand-secondary">Evaluation Score</p>
              <p className="font-sans text-[20px] font-bold text-brand-primary">
                {allocation.compositeScore.toFixed(1)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
