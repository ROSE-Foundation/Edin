'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { BuddyProfile, FirstTaskRecommendation } from '@edin/shared';

interface BuddyAssignmentData {
  id: string;
  contributorId: string;
  buddyId: string;
  assignedAt: string;
  expiresAt: string;
  isActive: boolean;
  notes: string | null;
  isExpired: boolean;
  buddy: BuddyProfile;
}

interface BuddyAssignmentResponse {
  data: BuddyAssignmentData | null;
  meta: { timestamp: string; correlationId: string };
}

interface FirstTaskResponse {
  data: FirstTaskRecommendation | null;
  meta: { timestamp: string; correlationId: string };
}

export function useBuddyAssignment() {
  const { data, isLoading, error } = useQuery<BuddyAssignmentResponse>({
    queryKey: ['admission', 'buddy-assignment', 'mine'],
    queryFn: async () => {
      return apiClient<BuddyAssignmentResponse>('/api/v1/admission/buddy-assignments/mine');
    },
    staleTime: 60_000,
    retry: 1,
  });

  return {
    buddyAssignment: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useFirstTaskRecommendation() {
  const { data, isLoading, error } = useQuery<FirstTaskResponse>({
    queryKey: ['admission', 'first-task', 'mine'],
    queryFn: async () => {
      return apiClient<FirstTaskResponse>('/api/v1/admission/buddy-assignments/mine/first-task');
    },
    staleTime: 60_000,
    retry: 1,
  });

  return {
    task: data?.data ?? null,
    isLoading,
    error,
  };
}
