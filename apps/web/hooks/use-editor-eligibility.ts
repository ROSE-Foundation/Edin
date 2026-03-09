'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  EligibilityCheckDto,
  EditorApplicationDto,
  EditorDashboardDto,
  ArticleDto,
  ApiSuccessResponse,
} from '@edin/shared';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEditorEligibility() {
  const { data, isLoading, error } = useQuery<EligibilityCheckDto[]>({
    queryKey: ['editor-eligibility'],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EligibilityCheckDto[]>>(
        '/api/v1/publication/editor-eligibility',
      );
      return response.data;
    },
  });
  return { eligibility: data ?? [], isLoading, error };
}

export function useMyEditorApplications() {
  const { data, isLoading, error } = useQuery<EditorApplicationDto[]>({
    queryKey: ['editor-applications', 'mine'],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EditorApplicationDto[]>>(
        '/api/v1/publication/editor-applications/mine',
      );
      return response.data;
    },
  });
  return { applications: data ?? [], isLoading, error };
}

export function useEditorDashboard(enabled = false) {
  const { data, isLoading, error } = useQuery<EditorDashboardDto>({
    queryKey: ['editor-dashboard'],
    enabled,
    retry: false,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EditorDashboardDto>>(
        '/api/v1/publication/editor-dashboard',
      );
      return response.data;
    },
  });
  return { dashboard: data ?? null, isLoading, error };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSubmitEditorApplication() {
  const queryClient = useQueryClient();
  return useMutation<EditorApplicationDto, Error, { domain: string; applicationStatement: string }>(
    {
      mutationFn: async (data) => {
        const response = await apiClient<ApiSuccessResponse<EditorApplicationDto>>(
          '/api/v1/publication/editor-applications',
          { method: 'POST', body: JSON.stringify(data) },
        );
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['editor-eligibility'] });
        queryClient.invalidateQueries({ queryKey: ['editor-applications'] });
      },
    },
  );
}

export function useClaimArticle() {
  const queryClient = useQueryClient();
  return useMutation<ArticleDto, Error, string>({
    mutationFn: async (articleId) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(
        `/api/v1/publication/editor-claim/${articleId}`,
        { method: 'POST' },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editor-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
