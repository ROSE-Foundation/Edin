'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  useArticle,
  useArticleMetrics,
  useArticleRewardAllocation,
} from '../../../../../hooks/use-article';
import { ArticleMetricsView } from '../../../../../components/features/publication/metrics/article-metrics-view';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ArticleMetricsPage({ params }: Props) {
  const { id } = use(params);
  const { article, isLoading: articleLoading } = useArticle(id);
  const { metrics, isLoading: metricsLoading } = useArticleMetrics(id);
  const { allocation } = useArticleRewardAllocation(id);

  if (articleLoading || metricsLoading) {
    return (
      <div className="mx-auto max-w-[900px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="space-y-[var(--spacing-lg)]">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-sunken" />
          <div className="h-64 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-48 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-[900px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="font-sans text-[15px] text-semantic-error">Article not found.</p>
        <Link
          href="/publication"
          className="mt-[var(--spacing-md)] inline-block font-sans text-[14px] text-brand-accent hover:underline"
        >
          Back to Publication
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <Link
        href="/publication"
        className="mb-[var(--spacing-lg)] inline-block font-sans text-[14px] text-brand-secondary hover:text-brand-accent"
      >
        &larr; Back to Publication
      </Link>
      <ArticleMetricsView article={article} metrics={metrics} allocation={allocation} />
    </div>
  );
}
