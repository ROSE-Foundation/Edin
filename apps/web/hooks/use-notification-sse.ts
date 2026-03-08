'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { getAccessToken } from '../lib/auth';
import type {
  NotificationDto,
  NotificationSseEvent,
  UnreadCountResponse,
  PaginationMeta,
} from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_RECONNECT_DELAY = 30_000;
const RECONNECTING_THRESHOLD = 5_000;

interface NotificationApiResponse {
  data: NotificationDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useNotificationSse() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;

      const token = getAccessToken();
      if (!token) return;

      const url = `${API_BASE_URL}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url, { withCredentials: true });
      eventSource = es;

      es.onopen = () => {
        reconnectAttemptRef.current = 0;
        setIsReconnecting(false);
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationSseEvent;

          if (data.type === 'notification.new' && data.notification) {
            let cacheWasPopulated = false;

            // Prepend to TanStack Query cache
            queryClient.setQueriesData<InfiniteData<NotificationApiResponse, string | undefined>>(
              { queryKey: ['notifications'] },
              (old) => {
                if (!old) return old;

                cacheWasPopulated = true;
                const firstPage = old.pages[0];
                const alreadyExists = firstPage.data.some(
                  (item) => item.id === data.notification.id,
                );
                if (alreadyExists) return old;

                return {
                  ...old,
                  pages: [
                    {
                      ...firstPage,
                      data: [data.notification, ...firstPage.data],
                    },
                    ...old.pages.slice(1),
                  ],
                };
              },
            );

            // If cache was empty, trigger a refetch so the notification appears when list mounts
            if (!cacheWasPopulated) {
              void queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }

            // Increment unread count for the notification's category
            queryClient.setQueryData<UnreadCountResponse>(
              ['notifications', 'unread-counts'],
              (old) => {
                if (!old) return old;
                const category = data.notification.category;
                return {
                  ...old,
                  data: {
                    ...old.data,
                    [category]: (old.data[category] ?? 0) + 1,
                  },
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

        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptRef.current),
          MAX_RECONNECT_DELAY,
        );
        reconnectAttemptRef.current += 1;

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
  }, [queryClient]);

  return { isConnected, isReconnecting };
}
