'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  ContributorScoresSummaryDto,
  ScoringFormulaVersionDto,
  CreateFormulaVersionInput,
  PaginationMeta,
} from '@edin/shared';

interface ScoresResponse {
  data: ContributorScoresSummaryDto;
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface FormulaResponse {
  data: ScoringFormulaVersionDto;
  meta: { timestamp: string; correlationId: string };
}

interface FormulaHistoryResponse {
  data: ScoringFormulaVersionDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useMyScores() {
  const { data, isLoading, error } = useQuery<ScoresResponse>({
    queryKey: ['rewards', 'scores', 'mine'],
    queryFn: () => apiClient<ScoresResponse>('/api/v1/rewards/scores'),
    staleTime: 30_000,
  });

  return {
    summary: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useActiveFormula() {
  const { data, isLoading, error } = useQuery<FormulaResponse>({
    queryKey: ['admin', 'scoring', 'formula', 'active'],
    queryFn: () => apiClient<FormulaResponse>('/api/v1/admin/scoring/formula/active'),
    staleTime: 60_000,
  });

  return {
    formula: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useFormulaHistory() {
  const { data, isLoading, error } = useQuery<FormulaHistoryResponse>({
    queryKey: ['admin', 'scoring', 'formula', 'history'],
    queryFn: () => apiClient<FormulaHistoryResponse>('/api/v1/admin/scoring/formula/history'),
    staleTime: 30_000,
  });

  return {
    formulas: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useCreateFormulaVersion() {
  const queryClient = useQueryClient();

  return useMutation<FormulaResponse, Error, CreateFormulaVersionInput>({
    mutationFn: (input) =>
      apiClient<FormulaResponse>('/api/v1/admin/scoring/formula', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scoring', 'formula'] });
    },
  });
}

export function useContributorScoresAdmin(contributorId: string | null) {
  const { data, isLoading, error } = useQuery<ScoresResponse>({
    queryKey: ['admin', 'scoring', 'scores', contributorId],
    queryFn: () => {
      if (!contributorId) throw new Error('contributorId is required');
      return apiClient<ScoresResponse>(`/api/v1/admin/scoring/scores/${contributorId}`);
    },
    enabled: !!contributorId,
    staleTime: 30_000,
  });

  return {
    summary: data?.data ?? null,
    isLoading,
    error,
  };
}
