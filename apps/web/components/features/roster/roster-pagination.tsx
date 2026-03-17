'use client';

interface RosterPaginationProps {
  total: number;
  loadedCount: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function RosterPagination({
  total,
  loadedCount,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
}: RosterPaginationProps) {
  if (!hasMore && loadedCount === 0) {
    return null;
  }

  return (
    <div className="mt-[var(--spacing-xl)] text-center">
      <p className="font-sans text-[14px] text-text-secondary">
        Showing {loadedCount} of {total} contributors
      </p>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-xl)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-text-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Load more contributors. Currently showing ${loadedCount} of ${total}`}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
