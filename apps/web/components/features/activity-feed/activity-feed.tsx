'use client';

import { useEffect, useRef, useState } from 'react';
import { useActivityFeed, useActivitySse } from '../../../hooks/use-activity-feed';
import { ActivityItem } from './activity-item';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'] as const;

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-[var(--spacing-sm)]" aria-label="Loading activity feed">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
        >
          <div className="flex gap-[var(--spacing-md)]">
            <div className="skeleton h-[36px] w-[36px] rounded-full" />
            <div className="flex-1">
              <div className="skeleton h-[18px] w-3/4" />
              <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-full" />
              <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-sm)]">
                <div className="skeleton h-[14px] w-[80px]" />
                <div className="skeleton h-[14px] w-[60px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const [domain, setDomain] = useState('');
  const filters = domain ? { domain } : {};

  const { activities, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityFeed(filters);
  const { isReconnecting, newItemIds } = useActivitySse();

  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      {isReconnecting && (
        <div
          className="mb-[var(--spacing-md)] rounded-[8px] border border-[#C4956A]/30 bg-[#C4956A]/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-[#C4956A]"
          role="status"
          aria-live="polite"
        >
          Reconnecting...
        </div>
      )}

      <div className="mb-[var(--spacing-lg)] flex flex-wrap gap-[var(--spacing-sm)]">
        <button
          type="button"
          onClick={() => setDomain('')}
          className={`inline-flex min-h-[36px] items-center rounded-full px-[var(--spacing-md)] font-sans text-[13px] transition-colors duration-200 motion-reduce:transition-none ${
            domain === ''
              ? 'bg-brand-primary text-surface-raised'
              : 'border border-surface-border bg-surface-raised text-brand-secondary hover:bg-surface-base'
          }`}
        >
          All
        </button>
        {DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDomain(d)}
            className={`inline-flex min-h-[36px] items-center rounded-full px-[var(--spacing-md)] font-sans text-[13px] transition-colors duration-200 motion-reduce:transition-none ${
              domain === d
                ? 'bg-brand-primary text-surface-raised'
                : 'border border-surface-border bg-surface-raised text-brand-secondary hover:bg-surface-base'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {isPending ? (
        <ActivityFeedSkeleton />
      ) : error ? (
        <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-semantic-error">
          Unable to load activity feed. Please try again later.
        </p>
      ) : activities.length === 0 ? (
        <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-brand-secondary">
          No activity to display yet. Contributions will appear here as they happen.
        </p>
      ) : (
        <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Activity feed">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isNew={newItemIds.has(activity.id)}
            />
          ))}
          {hasNextPage && <div ref={observerRef} className="h-[1px]" aria-hidden="true" />}
          {isFetchingNextPage && (
            <div className="py-[var(--spacing-md)] text-center">
              <div className="skeleton mx-auto h-[36px] w-[36px] rounded-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
