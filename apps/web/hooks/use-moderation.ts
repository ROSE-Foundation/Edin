'use client';

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  FlaggedArticleDto,
  ModerationReportDto,
  ApiSuccessResponse,
  PaginationMeta,
} from '@edin/shared';

// ─── Queries ──────────────────────────────────────────────────────────────────

interface FlaggedArticlesPageResponse {
  data: FlaggedArticleDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useFlaggedArticles() {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<FlaggedArticlesPageResponse>({
      queryKey: ['moderation', 'flagged'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: '20' });
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<FlaggedArticlesPageResponse>(
          `/api/v1/admin/publication/moderation/flagged?${params.toString()}`,
        );
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

export function useModerationReport(articleId: string | undefined) {
  const { data, isLoading, error } = useQuery<ModerationReportDto>({
    queryKey: ['moderation', 'report', articleId],
    enabled: !!articleId,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ModerationReportDto>>(
        `/api/v1/admin/publication/moderation/${articleId}/report`,
      );
      return response.data;
    },
  });

  return { report: data ?? null, isLoading, error };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface ModerationActionInput {
  articleId: string;
  reason: string;
}

export function useDismissFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, reason }: ModerationActionInput) => {
      return apiClient<ApiSuccessResponse<ModerationReportDto>>(
        `/api/v1/admin/publication/moderation/${articleId}/dismiss`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
}

export function useRequestCorrections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, reason }: ModerationActionInput) => {
      return apiClient<ApiSuccessResponse<ModerationReportDto>>(
        `/api/v1/admin/publication/moderation/${articleId}/request-corrections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
}

export function useRejectArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, reason }: ModerationActionInput) => {
      return apiClient<ApiSuccessResponse<ModerationReportDto>>(
        `/api/v1/admin/publication/moderation/${articleId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
}

export function useUnpublishArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ articleId, reason }: ModerationActionInput) => {
      return apiClient<ApiSuccessResponse<{ success: boolean }>>(
        `/api/v1/admin/publication/moderation/${articleId}/unpublish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
