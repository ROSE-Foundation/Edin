'use client';

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  NotificationDto,
  NotificationCategory,
  UnreadCountResponse,
  PaginationMeta,
} from '@edin/shared';

interface NotificationApiResponse {
  data: NotificationDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface MarkReadResponse {
  data: { read: boolean; readAt: string };
  meta: { timestamp: string; correlationId: string };
}

interface MarkAllReadResponse {
  data: { count: number };
  meta: { timestamp: string; correlationId: string };
}

interface NotificationFilters {
  category?: NotificationCategory;
}

export function useNotifications(filters: NotificationFilters = {}) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<NotificationApiResponse>({
      queryKey: ['notifications', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);
        if (filters.category) params.set('category', filters.category);

        return apiClient<NotificationApiResponse>(`/api/v1/notifications?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    notifications,
    isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useUnreadCounts() {
  const { data, isPending, error } = useQuery<UnreadCountResponse>({
    queryKey: ['notifications', 'unread-counts'],
    queryFn: () => apiClient<UnreadCountResponse>('/api/v1/notifications/unread-counts'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    counts: data?.data ?? {},
    isPending,
    error,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkReadResponse,
    Error,
    { notificationId: string; category: string },
    {
      previousNotifications: [
        queryKey: readonly unknown[],
        data: InfiniteData<NotificationApiResponse, string | undefined> | undefined,
      ][];
      previousCounts: UnreadCountResponse | undefined;
    }
  >({
    mutationFn: ({ notificationId }) =>
      apiClient<MarkReadResponse>(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),
    onMutate: async ({ notificationId, category }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousNotifications = queryClient.getQueriesData<
        InfiniteData<NotificationApiResponse, string | undefined>
      >({ queryKey: ['notifications'] });

      const previousCounts = queryClient.getQueryData<UnreadCountResponse>([
        'notifications',
        'unread-counts',
      ]);

      // Optimistic update: mark as read in cache
      queryClient.setQueriesData<InfiniteData<NotificationApiResponse, string | undefined>>(
        { queryKey: ['notifications'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((n) =>
                n.id === notificationId
                  ? { ...n, read: true, readAt: new Date().toISOString() }
                  : n,
              ),
            })),
          };
        },
      );

      // Optimistic: decrement unread count only if the notification was actually unread
      const wasUnread = previousNotifications.some(([, data]) =>
        data?.pages.some((page) => page.data.some((n) => n.id === notificationId && !n.read)),
      );
      if (wasUnread && previousCounts) {
        queryClient.setQueryData<UnreadCountResponse>(['notifications', 'unread-counts'], {
          ...previousCounts,
          data: {
            ...previousCounts.data,
            [category]: Math.max(0, (previousCounts.data[category] ?? 0) - 1),
          },
        });
      }

      return { previousNotifications, previousCounts };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        for (const [key, data] of context.previousNotifications) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(['notifications', 'unread-counts'], context.previousCounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<MarkAllReadResponse, Error, NotificationCategory | undefined>({
    mutationFn: (category) => {
      const params = category ? `?category=${category}` : '';
      return apiClient<MarkAllReadResponse>(`/api/v1/notifications/read-all${params}`, {
        method: 'PATCH',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
