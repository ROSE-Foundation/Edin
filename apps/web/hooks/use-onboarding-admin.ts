'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { OnboardingStatus } from '@edin/shared';

interface OnboardingStatusListResponse {
  data: OnboardingStatus[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination?: { cursor: string | null; hasMore: boolean; total: number };
  };
}

export function useOnboardingStatusList(params: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);

  const queryString = searchParams.toString();
  const url = `/api/v1/admission/onboarding${queryString ? `?${queryString}` : ''}`;

  const { data, isLoading, error } = useQuery<OnboardingStatusListResponse>({
    queryKey: ['admission', 'onboarding', 'list', params.status],
    queryFn: async () => {
      return apiClient<OnboardingStatusListResponse>(url);
    },
    staleTime: 30_000,
    retry: 1,
  });

  return {
    statuses: data?.data ?? [],
    isLoading,
    error,
    pagination: data?.meta?.pagination ?? null,
  };
}
