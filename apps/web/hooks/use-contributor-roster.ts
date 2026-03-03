'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PublicContributorProfile, PaginationMeta } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RosterApiResponse {
  data: PublicContributorProfile[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination: PaginationMeta;
  };
}

interface UseContributorRosterOptions {
  domain: string | null;
  search: string;
  initialData?: PublicContributorProfile[];
  initialTotal?: number;
}

export function useContributorRoster({
  domain,
  search,
  initialData = [],
  initialTotal = 0,
}: UseContributorRosterOptions) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useInfiniteQuery({
      queryKey: ['contributors', 'roster', { domain, search }],
      initialData:
        initialData.length > 0 && !domain && !search
          ? {
              pages: [
                {
                  data: initialData,
                  meta: {
                    timestamp: new Date().toISOString(),
                    correlationId: 'initial',
                    pagination: {
                      cursor:
                        initialData.length >= 20 ? initialData[initialData.length - 1].id : null,
                      hasMore: initialData.length >= 20,
                      total: initialTotal,
                    },
                  },
                },
              ] as RosterApiResponse[],
              pageParams: [undefined] as (string | undefined)[],
            }
          : undefined,
      initialPageParam: undefined as string | undefined,
      queryFn: async ({ pageParam }): Promise<RosterApiResponse> => {
        const params = new URLSearchParams();
        if (domain) params.set('domain', domain);
        if (search) params.set('search', search);
        if (pageParam) params.set('cursor', pageParam);
        params.set('limit', '20');

        const url = `${API_BASE_URL}/api/v1/contributors${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.error?.message || `API error: ${response.status}`);
        }

        return response.json();
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.meta.pagination.hasMore) {
          return lastPage.meta.pagination.cursor ?? undefined;
        }
        return undefined;
      },
    });

  const contributors = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[data.pages.length - 1]?.meta.pagination.total ?? 0;

  return {
    contributors,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    total,
    error,
  };
}
