'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { useAllArticles } from '../../../hooks/use-article';
import { useEditorDashboard, useClaimArticle } from '../../../hooks/use-editor-eligibility';
import { DraftCard } from '../../../components/features/publication/article-list/draft-card';
import { EditorDashboardSection } from '../../../components/features/publication/editor-eligibility/editor-dashboard-section';
import { EditorRewardSummary } from '../../../components/features/publication/metrics/editor-reward-summary';
import { useEditorRewardSummary } from '../../../hooks/use-article';

const TABS = [
  { id: 'all', label: 'All', status: undefined },
  { id: 'drafts', label: 'Drafts', status: 'DRAFT' },
  { id: 'review', label: 'In Review', status: 'EDITORIAL_REVIEW' },
  { id: 'revisions', label: 'Revisions', status: 'REVISION_REQUESTED' },
  { id: 'published', label: 'Published', status: 'PUBLISHED' },
] as const;

export default function PublicationPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const selectedTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const { user } = useAuth();
  const isEditor = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const { articles, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAllArticles(selectedTab.status);
  const { dashboard } = useEditorDashboard(isEditor);
  const claimArticle = useClaimArticle();
  const { summary: editorRewardSummary } = useEditorRewardSummary();

  return (
    <div className="mx-auto max-w-[960px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] flex items-center justify-between">
        <h1 className="font-serif text-[2rem] font-bold text-brand-primary">Publication</h1>
        <div className="flex gap-[var(--spacing-sm)]">
          <Link
            href="/dashboard/publication/editor-application"
            className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
          >
            Editor Application
          </Link>
          <Link
            href="/dashboard/publication/new"
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
          >
            Write
          </Link>
        </div>
      </div>

      {/* Editor Dashboard (shown when user has editor data) */}
      {dashboard && (
        <>
          <EditorDashboardSection
            activeAssignments={dashboard.activeAssignments}
            completedReviews={dashboard.completedReviews}
            availableArticles={dashboard.availableArticles}
            onClaim={(articleId) => claimArticle.mutate(articleId)}
            isClaiming={claimArticle.isPending}
          />
          {editorRewardSummary && (
            <div className="mb-[var(--spacing-xl)]">
              <EditorRewardSummary summary={editorRewardSummary} />
            </div>
          )}
        </>
      )}

      {/* Status filter tabs */}
      <div className="mb-[var(--spacing-lg)] flex gap-[var(--spacing-xs)] border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] transition-colors"
            style={{
              color:
                activeTab === tab.id
                  ? 'var(--color-brand-accent, #C4956A)'
                  : 'var(--color-brand-secondary, #6B7B8D)',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid var(--color-brand-accent, #C4956A)'
                  : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Article list */}
      {isPending && articles.length === 0 ? (
        <div className="space-y-[var(--spacing-md)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[100px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
            />
          ))}
        </div>
      ) : error ? (
        <p className="font-sans text-[15px] text-semantic-error">
          Failed to load articles. Please try again.
        </p>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center gap-[var(--spacing-lg)] py-[var(--spacing-4xl)]">
          <p className="font-sans text-[17px] text-brand-secondary">
            {activeTab === 'all'
              ? 'No articles yet'
              : `No ${selectedTab.label.toLowerCase()} articles`}
          </p>
          {activeTab === 'all' || activeTab === 'drafts' ? (
            <Link
              href="/dashboard/publication/new"
              className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
            >
              Start Writing
            </Link>
          ) : null}
        </div>
      ) : (
        <div>
          <div className="space-y-[var(--spacing-md)]">
            {articles.map((article) => (
              <DraftCard key={article.id} article={article} />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-[var(--spacing-xl)] flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-[var(--radius-md)] border border-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-accent transition-colors hover:bg-brand-accent-subtle disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
