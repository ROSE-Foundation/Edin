'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import type { PublicContributorProfile } from '@edin/shared';
import { useContributorRoster } from '../../../hooks/use-contributor-roster';
import { RosterFilters } from './roster-filters';
import { ContributorRosterGrid } from './contributor-roster-grid';
import { RosterPagination } from './roster-pagination';
import { RosterSkeleton } from './roster-skeleton';

interface RosterContentProps {
  initialContributors: PublicContributorProfile[];
  initialTotal: number;
}

export function RosterContent({ initialContributors, initialTotal }: RosterContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [debouncedSearchInput, setDebouncedSearchInput] = useState(searchInput);
  const deferredSearch = useDeferredValue(debouncedSearchInput);

  const activeDomain = searchParams.get('domain');
  const currentQuery = searchParams.toString();

  const { contributors, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, total } =
    useContributorRoster({
      domain: activeDomain,
      search: deferredSearch,
      initialData: initialContributors,
      initialTotal,
    });

  const updateParams = useCallback(
    (domain: string | null, search: string) => {
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (search) params.set('search', search);
      const query = params.toString();
      if (query === currentQuery) {
        return;
      }

      router.replace(query ? `?${query}` : '/contributors', { scroll: false });
    },
    [currentQuery, router],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchInput(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    updateParams(activeDomain, debouncedSearchInput);
  }, [activeDomain, debouncedSearchInput, updateParams]);

  useEffect(() => {
    resultsHeadingRef.current?.focus();
  }, [activeDomain, deferredSearch]);

  const handleDomainChange = useCallback(
    (domain: string | null) => {
      updateParams(domain, debouncedSearchInput);
    },
    [debouncedSearchInput, updateParams],
  );

  const handleSearchChange = useCallback((search: string) => {
    setSearchInput(search);
  }, []);

  const isFiltered = activeDomain !== null || deferredSearch.length > 0;

  if (isLoading && contributors.length === 0) {
    return <RosterSkeleton />;
  }

  return (
    <>
      <RosterFilters
        activeDomain={activeDomain}
        searchValue={searchInput}
        onDomainChange={handleDomainChange}
        onSearchChange={handleSearchChange}
      />
      <div className="mt-[var(--spacing-xl)]">
        <h2 ref={resultsHeadingRef} tabIndex={-1} className="sr-only">
          Contributor results
        </h2>
        <ContributorRosterGrid contributors={contributors} isFiltered={isFiltered} />
      </div>
      <RosterPagination
        total={total}
        loadedCount={contributors.length}
        hasMore={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </>
  );
}
