'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  AdminArticleListItemDto,
  AdminTransitionAction,
  ApiSuccessResponse,
  PaginationMeta,
} from '@edin/shared';

interface AdminArticlesPageResponse {
  data: AdminArticleListItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export interface AdminArticlesFilters {
  status?: string;
  domain?: string;
  search?: string;
}

export function useAdminArticles(filters: AdminArticlesFilters = {}) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<AdminArticlesPageResponse>({
      queryKey: ['admin', 'articles', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: '20' });
        if (filters.status) params.set('status', filters.status);
        if (filters.domain) params.set('domain', filters.domain);
        if (filters.search) params.set('search', filters.search);
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<AdminArticlesPageResponse>(`/api/v1/admin/articles?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const articles = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    articles,
    isLoading: isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export interface TransitionInput {
  articleId: string;
  action: AdminTransitionAction;
  reason: string;
  revisionRequests?: { description: string }[];
}

export function useTransitionArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, action, reason, revisionRequests }: TransitionInput) => {
      return apiClient<ApiSuccessResponse<AdminArticleListItemDto>>(
        `/api/v1/admin/articles/${articleId}/transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason, revisionRequests }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
}
