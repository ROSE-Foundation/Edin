'use client';

import { useState } from 'react';
import { ARTICLE_STATUSES } from '@edin/shared';
import type { AdminArticleListItemDto, AdminTransitionAction, ArticleStatus } from '@edin/shared';
import { useAdminArticles, useTransitionArticle } from '../../../../hooks/use-admin-articles';
import { useToast } from '../../../ui/toast';
import { TransitionDialog, TRANSITION_LABELS } from './transition-dialog';

const STATUS_STYLES: Record<ArticleStatus, string> = {
  DRAFT: 'bg-surface-subtle text-text-secondary',
  SUBMITTED: 'bg-[#eef2ff] text-[#4338ca]',
  EDITORIAL_REVIEW: 'bg-[#fef9c3] text-[#854d0e]',
  REVISION_REQUESTED: 'bg-[#ffedd5] text-[#9a3412]',
  APPROVED: 'bg-[#dcfce7] text-[#166534]',
  PUBLISHED: 'bg-[#d1fae5] text-[#065f46]',
  ARCHIVED: 'bg-[#fee2e2] text-[#991b1b]',
};

const ACTOR_LABELS: Record<string, string> = {
  AUTHOR: 'Author',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
  SYSTEM: 'System',
  NONE: '—',
};

function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-[var(--spacing-sm)] py-1 text-[12px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function NextActor({ article }: { article: AdminArticleListItemDto }) {
  const { role, name } = article.nextActor;
  if (role === 'NONE') return <span className="text-text-tertiary">—</span>;
  return (
    <span className="text-text-secondary">
      {ACTOR_LABELS[role]}
      {name ? <span className="text-text-tertiary"> · {name}</span> : null}
    </span>
  );
}

interface PendingTransition {
  article: AdminArticleListItemDto;
  action: AdminTransitionAction;
}

export function ArticlesList() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingTransition | null>(null);

  const { articles, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminArticles({ status: statusFilter || undefined, search: search || undefined });
  const transition = useTransitionArticle();
  const { toast } = useToast();

  const handleConfirm = (reason: string, revisionRequests?: { description: string }[]) => {
    if (!pending) return;
    transition.mutate(
      { articleId: pending.article.id, action: pending.action, reason, revisionRequests },
      {
        onSuccess: () => {
          toast({
            title: `${TRANSITION_LABELS[pending.action]} applied`,
            description: pending.article.title,
            variant: 'success',
          });
          setPending(null);
        },
        onError: (err) => {
          toast({
            title: 'Transition failed',
            description: err instanceof Error ? err.message : 'Unexpected error',
            variant: 'error',
          });
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-[var(--spacing-lg)] flex flex-wrap items-center gap-[var(--spacing-sm)]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author…"
          className="min-h-[40px] min-w-[240px] flex-1 rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] font-sans text-[14px] text-text-primary focus:border-accent-primary focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[40px] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] font-sans text-[14px] text-text-primary focus:border-accent-primary focus:outline-none"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {ARTICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="py-[var(--spacing-xl)] text-center font-sans text-[14px] text-text-secondary">
          Loading articles…
        </p>
      ) : error ? (
        <p className="py-[var(--spacing-xl)] text-center font-sans text-[14px] text-red-600">
          Failed to load articles.
        </p>
      ) : articles.length === 0 ? (
        <p className="py-[var(--spacing-xl)] text-center font-sans text-[14px] text-text-secondary">
          No articles match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-surface-subtle">
          <table className="w-full border-collapse font-sans text-[14px]">
            <thead>
              <tr className="border-b border-surface-subtle bg-surface-raised text-left text-text-tertiary">
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">Title</th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Domain
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Status
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Next actor
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-surface-subtle last:border-b-0">
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-text-primary">
                    <span className="font-medium">{article.title}</span>
                    <span className="ml-2 text-[12px] text-text-tertiary">
                      v{article.version} · {article.author.name}
                    </span>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-text-secondary">
                    {article.domain}
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <NextActor article={article} />
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    {article.availableActions.length === 0 ? (
                      <span className="text-text-tertiary">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-[var(--spacing-xs)]">
                        {article.availableActions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            onClick={() => setPending({ article, action })}
                            className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-sm)] py-1 text-[13px] text-text-primary hover:bg-surface-subtle"
                          >
                            {TRANSITION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="mt-[var(--spacing-lg)] text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary hover:bg-surface-subtle disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {pending && (
        <TransitionDialog
          action={pending.action}
          articleTitle={pending.article.title}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
          isLoading={transition.isPending}
        />
      )}
    </div>
  );
}
