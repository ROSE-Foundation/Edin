'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { getAccessToken } from '../lib/auth';
import type { ActivityEvent, PaginationMeta } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_RECONNECT_DELAY = 30_000;
const RECONNECTING_THRESHOLD = 5_000;

interface ActivityFeedResponse {
  data: ActivityEvent[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface ActivityFilters {
  domain?: string;
}

export function useActivityFeed(filters: ActivityFilters = {}) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ActivityFeedResponse>({
      queryKey: ['activity-feed', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);
        if (filters.domain) params.set('domain', filters.domain);

        return apiClient<ActivityFeedResponse>(`/api/v1/activity?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const activities = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    activities,
    isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useActivitySse() {
  const queryClient = useQueryClient();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const lastEventTimestampRef = useRef<string | null>(null);

  const fetchMissedEvents = useCallback(
    async (since: string) => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '100');
        // Fetch events newer than last known timestamp
        const response = await apiClient<ActivityFeedResponse>(
          `/api/v1/activity?${params.toString()}`,
        );

        if (response.data.length > 0) {
          queryClient.setQueriesData<InfiniteData<ActivityFeedResponse, string | undefined>>(
            { queryKey: ['activity-feed'] },
            (old) => {
              if (!old) return old;

              const existingIds = new Set(
                old.pages.flatMap((page) => page.data.map((item) => item.id)),
              );

              const newItems = response.data.filter(
                (item) => !existingIds.has(item.id) && new Date(item.createdAt) > new Date(since),
              );

              if (newItems.length === 0) return old;

              const firstPage = old.pages[0];
              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    data: [...newItems, ...firstPage.data],
                  },
                  ...old.pages.slice(1),
                ],
              };
            },
          );
        }
      } catch {
        // Failed to fetch missed events — will be fetched on next query
      }
    },
    [queryClient],
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const token = getAccessToken();
      if (!token) return;

      const url = `${API_BASE_URL}/api/v1/activity/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url, { withCredentials: true });
      eventSource = es;

      es.onopen = () => {
        const wasReconnecting = reconnectAttempt > 0;
        reconnectAttempt = 0;
        setIsReconnecting(false);
        setIsConnected(true);

        // If reconnecting, fetch missed events
        if (wasReconnecting && lastEventTimestampRef.current) {
          void fetchMissedEvents(lastEventTimestampRef.current);
        }
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; activity?: ActivityEvent };

          if (data.type === 'activity.new' && data.activity) {
            lastEventTimestampRef.current = data.activity.createdAt;

            // Track new item for fade-in animation
            const newId = data.activity.id;
            setNewItemIds((prev) => new Set([...prev, newId]));
            setTimeout(() => {
              setNewItemIds((prev) => {
                const next = new Set(prev);
                next.delete(newId);
                return next;
              });
            }, 2000);

            // Prepend to TanStack Query cache
            queryClient.setQueriesData<InfiniteData<ActivityFeedResponse, string | undefined>>(
              { queryKey: ['activity-feed'] },
              (old) => {
                if (!old) return old;

                const firstPage = old.pages[0];
                const alreadyExists = firstPage.data.some((item) => item.id === data.activity!.id);
                if (alreadyExists) return old;

                return {
                  ...old,
                  pages: [
                    {
                      ...firstPage,
                      data: [data.activity!, ...firstPage.data],
                    },
                    ...old.pages.slice(1),
                  ],
                };
              },
            );
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSource = null;
        setIsConnected(false);

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
        reconnectAttempt += 1;

        if (delay >= RECONNECTING_THRESHOLD) {
          setIsReconnecting(true);
        }

        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient, fetchMissedEvents]);

  return { isConnected, isReconnecting, newItemIds };
}
