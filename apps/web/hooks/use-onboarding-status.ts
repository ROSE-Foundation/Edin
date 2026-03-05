'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { OnboardingStatus } from '@edin/shared';

interface OnboardingStatusResponse {
  data: OnboardingStatus | null;
  meta: { timestamp: string; correlationId: string };
}

export function useOnboardingStatus() {
  const { data, isLoading, error } = useQuery<OnboardingStatusResponse>({
    queryKey: ['admission', 'onboarding', 'mine'],
    queryFn: async () => {
      return apiClient<OnboardingStatusResponse>('/api/v1/admission/onboarding/mine');
    },
    staleTime: 30_000,
    retry: 1,
  });

  return {
    onboardingStatus: data?.data ?? null,
    isLoading,
    error,
  };
}
