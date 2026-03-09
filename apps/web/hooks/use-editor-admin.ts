'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  EditorApplicationDto,
  ActiveEditorDto,
  EditorEligibilityCriteriaDto,
  ApiSuccessResponse,
} from '@edin/shared';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEditorApplications(filters?: { status?: string; domain?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.domain) params.set('domain', filters.domain);
  const qs = params.toString();

  const { data, isLoading, error } = useQuery<EditorApplicationDto[]>({
    queryKey: ['editor-applications', 'admin', filters],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EditorApplicationDto[]>>(
        `/api/v1/publication/editor-applications${qs ? `?${qs}` : ''}`,
      );
      return response.data;
    },
  });
  return { applications: data ?? [], isLoading, error };
}

export function useActiveEditors(domain?: string) {
  const qs = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  const { data, isLoading, error } = useQuery<ActiveEditorDto[]>({
    queryKey: ['editors', 'active', domain],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ActiveEditorDto[]>>(
        `/api/v1/publication/editors${qs}`,
      );
      return response.data;
    },
  });
  return { editors: data ?? [], isLoading, error };
}

export function useEditorCriteria() {
  const { data, isLoading, error } = useQuery<EditorEligibilityCriteriaDto[]>({
    queryKey: ['editor-criteria'],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EditorEligibilityCriteriaDto[]>>(
        '/api/v1/publication/editor-criteria',
      );
      return response.data;
    },
  });
  return { criteria: data ?? [], isLoading, error };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useReviewEditorApplication() {
  const queryClient = useQueryClient();
  return useMutation<
    EditorApplicationDto,
    Error,
    { applicationId: string; decision: string; reviewNotes?: string }
  >({
    mutationFn: async ({ applicationId, ...data }) => {
      const response = await apiClient<ApiSuccessResponse<EditorApplicationDto>>(
        `/api/v1/publication/editor-applications/${applicationId}/review`,
        { method: 'PATCH', body: JSON.stringify(data) },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editor-applications'] });
      queryClient.invalidateQueries({ queryKey: ['editors'] });
    },
  });
}

export function useRevokeEditor() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { contributorId: string; reason: string }>({
    mutationFn: async ({ contributorId, reason }) => {
      const response = await apiClient<ApiSuccessResponse<{ success: boolean }>>(
        `/api/v1/publication/editors/${contributorId}/revoke`,
        { method: 'POST', body: JSON.stringify({ reason }) },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editors'] });
      queryClient.invalidateQueries({ queryKey: ['editor-applications'] });
    },
  });
}

export function useUpdateEditorCriteria() {
  const queryClient = useQueryClient();
  return useMutation<
    EditorEligibilityCriteriaDto,
    Error,
    {
      domain: string;
      data: {
        minContributionCount?: number;
        minGovernanceWeight?: number;
        maxConcurrentAssignments?: number;
      };
    }
  >({
    mutationFn: async ({ domain, data }) => {
      const response = await apiClient<ApiSuccessResponse<EditorEligibilityCriteriaDto>>(
        `/api/v1/publication/editor-criteria/${domain}`,
        { method: 'PATCH', body: JSON.stringify(data) },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editor-criteria'] });
    },
  });
}
