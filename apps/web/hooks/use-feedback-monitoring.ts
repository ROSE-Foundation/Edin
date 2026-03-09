'use client';

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useToast } from '../components/ui/toast';
import type {
  FeedbackMetricsDto,
  OverdueReviewDto,
  EligibleReviewerDto,
  PaginationMeta,
} from '@edin/shared';

interface MetricsResponse {
  data: { metrics: FeedbackMetricsDto; slaHours: number };
  meta: { timestamp: string; correlationId: string };
}

interface OverdueResponse {
  data: OverdueReviewDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface SlaResponse {
  data: { hours: number };
  meta: { timestamp: string; correlationId: string };
}

interface EligibleReviewersResponse {
  data: EligibleReviewerDto[];
  meta: { timestamp: string; correlationId: string };
}

interface ReassignResponse {
  data: { oldFeedbackId: string; newPeerFeedbackId: string; newReviewerId: string };
  meta: { timestamp: string; correlationId: string };
}

export function useFeedbackMetrics() {
  const { data, isLoading, error } = useQuery<MetricsResponse>({
    queryKey: ['admin', 'feedback', 'metrics'],
    queryFn: () => apiClient<MetricsResponse>('/api/v1/admin/feedback/metrics'),
    staleTime: 30_000,
  });

  return {
    metrics: data?.data.metrics ?? null,
    slaHours: data?.data.slaHours ?? 48,
    isLoading,
    error,
  };
}

export function useOverdueReviews() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<OverdueResponse>({
      queryKey: ['admin', 'feedback', 'overdue'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (typeof pageParam === 'string' && pageParam.length > 0) {
          params.set('cursor', pageParam);
        }
        const qs = params.toString();
        return apiClient<OverdueResponse>(`/api/v1/admin/feedback/overdue${qs ? `?${qs}` : ''}`);
      },
      initialPageParam: '',
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore
          ? (lastPage.meta.pagination.cursor ?? undefined)
          : undefined,
      staleTime: 30_000,
    });

  const reviews = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    reviews,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export function useReassignFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      newReviewerId,
      reason,
    }: {
      feedbackId: string;
      newReviewerId: string;
      reason: string;
    }) => {
      return apiClient<ReassignResponse>(`/api/v1/admin/feedback/${feedbackId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ newReviewerId, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'overdue'] });
      toast({ title: 'Review reassigned.' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'error' });
    },
  });
}

export function useFeedbackSla() {
  const { data, isLoading, error } = useQuery<SlaResponse>({
    queryKey: ['admin', 'feedback', 'sla'],
    queryFn: () => apiClient<SlaResponse>('/api/v1/admin/feedback/settings/sla'),
    staleTime: 30_000,
  });

  return {
    hours: data?.data.hours ?? 48,
    isLoading,
    error,
  };
}

export function useUpdateFeedbackSla() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ hours }: { hours: number }) => {
      return apiClient<SlaResponse>('/api/v1/admin/feedback/settings/sla', {
        method: 'PUT',
        body: JSON.stringify({ hours }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'sla'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', 'overdue'] });
      toast({ title: 'SLA updated.' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'error' });
    },
  });
}

export function useEligibleReviewers(feedbackId: string | null) {
  const { data, isLoading, error } = useQuery<EligibleReviewersResponse>({
    queryKey: ['admin', 'feedback', feedbackId, 'eligible-reviewers'],
    queryFn: () => {
      if (!feedbackId) throw new Error('feedbackId is required');
      return apiClient<EligibleReviewersResponse>(
        `/api/v1/admin/feedback/${feedbackId}/eligible-reviewers`,
      );
    },
    enabled: !!feedbackId,
    staleTime: 30_000,
  });

  return {
    reviewers: data?.data ?? [],
    isLoading,
    error,
  };
}
