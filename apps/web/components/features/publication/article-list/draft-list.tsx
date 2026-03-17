'use client';

import Link from 'next/link';
import { useArticleDrafts } from '../../../../hooks/use-article';
import { DraftCard } from './draft-card';

export function DraftList() {
  const { drafts, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useArticleDrafts();

  if (isPending && drafts.length === 0) {
    return (
      <div className="space-y-[var(--spacing-md)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[100px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-sans text-[15px] text-semantic-error">
        Failed to load drafts. Please try again.
      </p>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-[var(--spacing-lg)] py-[var(--spacing-4xl)]">
        <p className="font-sans text-[17px] text-text-secondary">No drafts yet</p>
        <Link
          href="/publication/new"
          className="rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-accent-primary/90"
        >
          Start Writing
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-[var(--spacing-md)]">
        {drafts.map((draft) => (
          <DraftCard key={draft.id} article={draft} />
        ))}
      </div>
      {hasNextPage && (
        <div className="mt-[var(--spacing-xl)] flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[var(--radius-md)] border border-accent-primary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-accent-primary transition-colors hover:bg-accent-primary-subtle disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
