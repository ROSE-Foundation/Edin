'use client';

import { useState } from 'react';
import type { ArticleListItemDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';
import { StatusBadge } from '../editorial-workflow/article-lifecycle';

interface EditorDashboardSectionProps {
  activeAssignments: ArticleListItemDto[];
  completedReviews: number;
  availableArticles: ArticleListItemDto[];
  onClaim: (articleId: string) => void;
  isClaiming: boolean;
}

export function EditorDashboardSection({
  activeAssignments,
  completedReviews,
  availableArticles,
  onClaim,
  isClaiming,
}: EditorDashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmClaimId, setConfirmClaimId] = useState<string | null>(null);

  return (
    <div className="mb-[var(--spacing-xl)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between border-b border-surface-border pb-[var(--spacing-sm)]"
      >
        <h2 className="font-serif text-[1.25rem] font-bold text-brand-primary">
          Editorial Dashboard
        </h2>
        <span className="font-sans text-[14px] text-brand-secondary">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-lg)]">
          {/* Stats */}
          <div className="flex gap-[var(--spacing-lg)]">
            <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-md)]">
              <span className="block font-sans text-[24px] font-bold text-brand-primary">
                {activeAssignments.length}
              </span>
              <span className="font-sans text-[13px] text-brand-secondary">Active Reviews</span>
            </div>
            <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-md)]">
              <span className="block font-sans text-[24px] font-bold text-brand-primary">
                {completedReviews}
              </span>
              <span className="font-sans text-[13px] text-brand-secondary">Completed Reviews</span>
            </div>
          </div>

          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <div>
              <h3 className="mb-[var(--spacing-sm)] font-sans text-[15px] font-semibold text-brand-primary">
                My Active Reviews
              </h3>
              <div className="space-y-[var(--spacing-sm)]">
                {activeAssignments.map((article) => (
                  <ArticleCompactCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          )}

          {/* Available Articles */}
          <div>
            <h3 className="mb-[var(--spacing-sm)] font-sans text-[15px] font-semibold text-brand-primary">
              Available to Claim
            </h3>
            {availableArticles.length === 0 ? (
              <p className="font-sans text-[14px] text-brand-secondary">
                No articles available for review in your domain.
              </p>
            ) : (
              <div className="space-y-[var(--spacing-sm)]">
                {availableArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
                  >
                    <ArticleCompactCard article={article} />
                    {confirmClaimId === article.id ? (
                      <div className="flex shrink-0 gap-[var(--spacing-xs)]">
                        <button
                          onClick={() => {
                            onClaim(article.id);
                            setConfirmClaimId(null);
                          }}
                          disabled={isClaiming}
                          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
                        >
                          {isClaiming ? 'Claiming...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmClaimId(null)}
                          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary transition-colors hover:bg-surface-sunken"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClaimId(article.id)}
                        className="shrink-0 rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleCompactCard({ article }: { article: ArticleListItemDto }) {
  const domainColor = DOMAIN_COLORS[article.domain] ?? '#6B7B8D';

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-[var(--spacing-sm)]">
        <h4 className="truncate font-sans text-[14px] font-medium text-brand-primary">
          {article.title || 'Untitled'}
        </h4>
        <span
          className="shrink-0 rounded-full px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] font-medium text-surface-raised"
          style={{ backgroundColor: domainColor }}
        >
          {article.domain}
        </span>
        <StatusBadge status={article.status} domain={article.domain} />
      </div>
      {article.abstract && (
        <p className="mt-[2px] truncate font-sans text-[12px] text-brand-secondary">
          {article.abstract}
        </p>
      )}
    </div>
  );
}
