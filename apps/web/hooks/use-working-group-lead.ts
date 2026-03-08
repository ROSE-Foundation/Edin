'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { AnnouncementDto, DomainHealthIndicators, Domain } from '@edin/shared';

interface DashboardResponse {
  data: {
    id: string;
    name: string;
    description: string;
    domain: string;
    accentColor: string;
    memberCount: number;
    leadContributor: { id: string; name: string; avatarUrl: string | null } | null;
    createdAt: string;
    updatedAt: string;
    members: Array<{
      id: string;
      workingGroupId: string;
      contributorId: string;
      joinedAt: string;
      recentContributionCount?: number;
      contributor: {
        id: string;
        name: string;
        avatarUrl: string | null;
        domain: Domain | null;
        role: string;
      };
    }>;
    announcements: AnnouncementDto[];
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      domain: string;
      difficulty: string;
      estimatedEffort: string;
      status: string;
      sortOrder: number;
      claimedById: string | null;
      claimedAt: string | null;
      completedAt: string | null;
      createdById: string;
      createdAt: string;
      updatedAt: string;
      claimedBy: { id: string; name: string; avatarUrl: string | null } | null;
    }>;
    recentContributions: Array<{
      id: string;
      title: string;
      contributionType: string;
      createdAt: string;
      contributor: { id: string; name: string; avatarUrl: string | null };
      repository: { fullName: string };
    }>;
    healthIndicators: DomainHealthIndicators;
  };
  meta: { timestamp: string; correlationId: string };
}

interface AnnouncementsResponse {
  data: AnnouncementDto[];
  meta: { timestamp: string; correlationId: string };
}

interface AnnouncementResponse {
  data: AnnouncementDto;
  meta: { timestamp: string; correlationId: string };
}

interface AssignLeadResponse {
  data: {
    id: string;
    name: string;
    leadContributor: { id: string; name: string; avatarUrl: string | null } | null;
  };
  meta: { timestamp: string; correlationId: string };
}

interface TaskListResponse {
  data: Array<{
    id: string;
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
    status: string;
    sortOrder: number;
    claimedById: string | null;
    claimedAt: string | null;
    completedAt: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
  }>;
  meta: {
    timestamp: string;
    correlationId: string;
    pagination: {
      cursor: string | null;
      hasMore: boolean;
      total: number;
    };
  };
}

export function useLeadDashboard(workingGroupId: string) {
  const { data, isPending, error } = useQuery<DashboardResponse>({
    queryKey: ['working-groups', workingGroupId, 'dashboard'],
    queryFn: () =>
      apiClient<DashboardResponse>(`/api/v1/working-groups/${workingGroupId}/dashboard`),
    staleTime: 30_000,
    enabled: Boolean(workingGroupId),
  });

  return {
    dashboard: data?.data ?? null,
    isPending,
    error,
  };
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation<AnnouncementResponse, Error, { workingGroupId: string; content: string }>({
    mutationFn: ({ workingGroupId, content }) =>
      apiClient<AnnouncementResponse>(`/api/v1/working-groups/${workingGroupId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId],
      });
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId, 'announcements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId, 'dashboard'],
      });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { workingGroupId: string; announcementId: string }>({
    mutationFn: ({ workingGroupId, announcementId }) =>
      apiClient<void>(`/api/v1/working-groups/${workingGroupId}/announcements/${announcementId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId],
      });
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId, 'announcements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId, 'dashboard'],
      });
    },
  });
}

export function useAnnouncements(workingGroupId: string) {
  const { data, isPending, error } = useQuery<AnnouncementsResponse>({
    queryKey: ['working-groups', workingGroupId, 'announcements'],
    queryFn: () =>
      apiClient<AnnouncementsResponse>(`/api/v1/working-groups/${workingGroupId}/announcements`),
    staleTime: 30_000,
    enabled: Boolean(workingGroupId),
  });

  return {
    announcements: data?.data ?? [],
    isPending,
    error,
  };
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation<
    { data: { message: string } },
    Error,
    {
      workingGroupId: string;
      domain: string;
      tasks: Array<{ taskId: string; sortOrder: number }>;
    },
    {
      previousTaskLists: Array<
        [readonly unknown[], InfiniteData<TaskListResponse, string | undefined> | undefined]
      >;
      previousDashboard?: DashboardResponse;
    }
  >({
    mutationFn: ({ domain, tasks }) =>
      apiClient<{ data: { message: string } }>('/api/v1/tasks/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ domain, tasks }),
      }),
    onMutate: async ({ workingGroupId, domain, tasks }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({
        queryKey: ['working-groups', workingGroupId, 'dashboard'],
      });

      const previousTaskLists = queryClient.getQueriesData<
        InfiniteData<TaskListResponse, string | undefined>
      >({ queryKey: ['tasks'] });
      const previousDashboard = queryClient.getQueryData<DashboardResponse>([
        'working-groups',
        workingGroupId,
        'dashboard',
      ]);

      const sortOrderByTaskId = new Map(tasks.map((task) => [task.taskId, task.sortOrder]));

      queryClient.setQueriesData<InfiniteData<TaskListResponse, string | undefined>>(
        { queryKey: ['tasks'] },
        (old) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: [...page.data]
                .map((task) =>
                  task.domain === domain && sortOrderByTaskId.has(task.id)
                    ? { ...task, sortOrder: sortOrderByTaskId.get(task.id) ?? task.sortOrder }
                    : task,
                )
                .sort((a, b) => a.sortOrder - b.sortOrder),
            })),
          };
        },
      );

      queryClient.setQueryData<DashboardResponse>(
        ['working-groups', workingGroupId, 'dashboard'],
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: {
              ...old.data,
              tasks: [...old.data.tasks]
                .map((task) =>
                  sortOrderByTaskId.has(task.id)
                    ? { ...task, sortOrder: sortOrderByTaskId.get(task.id) ?? task.sortOrder }
                    : task,
                )
                .sort((a, b) => a.sortOrder - b.sortOrder),
            },
          };
        },
      );

      return { previousTaskLists, previousDashboard };
    },
    onError: (_error, variables, context) => {
      if (context?.previousTaskLists) {
        for (const [key, data] of context.previousTaskLists) {
          queryClient.setQueryData(key, data);
        }
      }

      if (context?.previousDashboard) {
        queryClient.setQueryData(
          ['working-groups', variables.workingGroupId, 'dashboard'],
          context.previousDashboard,
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId, 'dashboard'],
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (variables) {
        queryClient.invalidateQueries({
          queryKey: ['working-groups', variables.workingGroupId, 'dashboard'],
        });
      }
    },
  });
}

export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation<AssignLeadResponse, Error, { workingGroupId: string; contributorId: string }>({
    mutationFn: ({ workingGroupId, contributorId }) =>
      apiClient<AssignLeadResponse>(`/api/v1/working-groups/${workingGroupId}/lead`, {
        method: 'PATCH',
        body: JSON.stringify({ contributorId }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['working-groups', variables.workingGroupId],
      });
      queryClient.invalidateQueries({ queryKey: ['working-groups'] });
    },
  });
}
