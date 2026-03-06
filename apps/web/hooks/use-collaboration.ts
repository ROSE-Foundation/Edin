'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface CollaborationResponse {
  data: {
    id: string;
    contributionId: string;
    contributorId: string;
    role: string;
    splitPercentage: number;
    status: string;
    confirmedAt: string | null;
  };
  meta: { timestamp: string; correlationId: string };
}

export function useConfirmCollaboration() {
  const queryClient = useQueryClient();

  return useMutation<CollaborationResponse, Error, string>({
    mutationFn: async (collaborationId: string) => {
      return apiClient<CollaborationResponse>(
        `/api/v1/contributors/me/collaborations/${collaborationId}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        },
      );
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['contributions', 'me'] });
      queryClient.invalidateQueries({
        queryKey: ['contributions', 'me', response.data.contributionId],
      });
    },
  });
}

export function useDisputeCollaboration() {
  const queryClient = useQueryClient();

  return useMutation<CollaborationResponse, Error, { collaborationId: string; comment: string }>({
    mutationFn: async ({ collaborationId, comment }) => {
      return apiClient<CollaborationResponse>(
        `/api/v1/contributors/me/collaborations/${collaborationId}/dispute`,
        {
          method: 'POST',
          body: JSON.stringify({ comment }),
        },
      );
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['contributions', 'me'] });
      queryClient.invalidateQueries({
        queryKey: ['contributions', 'me', response.data.contributionId],
      });
    },
  });
}
