'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PaginationMeta, BuddyProfile } from '@edin/shared';

interface BuddyAssignmentItem {
  id: string;
  contributorId: string;
  buddyId: string;
  assignedAt: string;
  expiresAt: string;
  isActive: boolean;
  notes: string | null;
  contributor: { id: string; name: string; domain: string | null; avatarUrl: string | null } | null;
  buddy: { id: string; name: string; domain: string | null; avatarUrl: string | null } | null;
}

interface BuddyAssignmentListResponse {
  data: BuddyAssignmentItem[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface EligibleBuddiesResponse {
  data: BuddyProfile[];
  meta: { timestamp: string; correlationId: string };
}

interface OverrideBuddyResponse {
  data: BuddyAssignmentItem;
  meta: { timestamp: string; correlationId: string };
}

interface UseBuddyAssignmentListOptions {
  domain?: string;
  isActive?: boolean;
}

export function useBuddyAssignmentList({ domain, isActive }: UseBuddyAssignmentListOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery<BuddyAssignmentListResponse>({
    queryKey: ['admission', 'buddy-assignments', { domain, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (isActive !== undefined) params.set('isActive', String(isActive));
      params.set('limit', '20');

      const qs = params.toString();
      return apiClient<BuddyAssignmentListResponse>(
        `/api/v1/admission/buddy-assignments${qs ? `?${qs}` : ''}`,
      );
    },
    staleTime: 30_000,
  });

  const assignments = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return { assignments, pagination, isLoading, error, refetch };
}

export function useEligibleBuddies(domain?: string) {
  const { data, isLoading, error } = useQuery<EligibleBuddiesResponse>({
    queryKey: ['admission', 'buddy-assignments', 'eligible', domain],
    queryFn: async () => {
      const params = domain ? `?domain=${domain}` : '';
      return apiClient<EligibleBuddiesResponse>(
        `/api/v1/admission/buddy-assignments/eligible${params}`,
      );
    },
    staleTime: 30_000,
  });

  return { buddies: data?.data ?? [], isLoading, error };
}

export function useOverrideBuddyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      newBuddyId,
    }: {
      assignmentId: string;
      newBuddyId: string;
    }) => {
      return apiClient<OverrideBuddyResponse>(
        `/api/v1/admission/buddy-assignments/${assignmentId}/override`,
        {
          method: 'POST',
          body: JSON.stringify({ newBuddyId }),
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission', 'buddy-assignments'] });
    },
  });
}
