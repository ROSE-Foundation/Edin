'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { TaskDto, PaginationMeta } from '@edin/shared';

interface TaskListResponse {
  data: TaskDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface TaskDetailResponse {
  data: TaskDto;
  meta: { timestamp: string; correlationId: string };
}

interface TaskFilters {
  domain?: string;
  difficulty?: string;
  status?: string;
}

export function useTasks(filters: TaskFilters = {}) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<TaskListResponse>({
      queryKey: ['tasks', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);
        if (filters.domain) params.set('domain', filters.domain);
        if (filters.difficulty) params.set('difficulty', filters.difficulty);
        if (filters.status) params.set('status', filters.status);

        return apiClient<TaskListResponse>(`/api/v1/tasks?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const tasks = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    tasks,
    isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useMyTasks() {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<TaskListResponse>({
      queryKey: ['tasks', 'me'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<TaskListResponse>(`/api/v1/tasks/me?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const tasks = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    tasks,
    isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

export function useTask(id: string) {
  const { data, isPending, error } = useQuery<TaskDetailResponse>({
    queryKey: ['tasks', id],
    queryFn: () => apiClient<TaskDetailResponse>(`/api/v1/tasks/${id}`),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

  return {
    task: data?.data ?? null,
    isPending,
    error,
  };
}

type InfiniteTaskSnapshot = [
  queryKey: readonly unknown[],
  data: InfiniteData<TaskListResponse, string | undefined> | undefined,
];

function updateInfiniteTaskPages(
  data: InfiniteData<TaskListResponse, string | undefined> | undefined,
  updater: (task: TaskDto) => TaskDto,
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map(updater),
    })),
  };
}

export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskDetailResponse,
    Error,
    string,
    {
      previousTaskLists: InfiniteTaskSnapshot[];
      previousMyTasks?: InfiniteData<TaskListResponse, string | undefined>;
    }
  >({
    mutationFn: (taskId: string) =>
      apiClient<TaskDetailResponse>(`/api/v1/tasks/${taskId}/claim`, {
        method: 'PATCH',
      }),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTaskLists = queryClient.getQueriesData<
        InfiniteData<TaskListResponse, string | undefined>
      >({ queryKey: ['tasks'] });
      const previousMyTasks = queryClient.getQueryData<
        InfiniteData<TaskListResponse, string | undefined>
      >(['tasks', 'me']);

      let claimedTask: TaskDto | null = null;

      queryClient.setQueriesData<InfiniteData<TaskListResponse, string | undefined>>(
        { queryKey: ['tasks'] },
        (old) =>
          updateInfiniteTaskPages(old, (task) => {
            if (task.id !== taskId) return task;
            claimedTask = { ...task, status: 'CLAIMED' };
            return claimedTask;
          }),
      );

      if (claimedTask) {
        queryClient.setQueryData<InfiniteData<TaskListResponse, string | undefined>>(
          ['tasks', 'me'],
          (old) => {
            if (!old) {
              return {
                pageParams: [undefined],
                pages: [
                  {
                    data: [claimedTask as TaskDto],
                    meta: {
                      timestamp: new Date().toISOString(),
                      correlationId: 'optimistic',
                      pagination: { cursor: null, hasMore: false, total: 1 },
                    },
                  },
                ],
              };
            }

            const alreadyPresent = old.pages.some((page) =>
              page.data.some((task) => task.id === taskId),
            );

            if (alreadyPresent) {
              return updateInfiniteTaskPages(old, (task) =>
                task.id === taskId ? { ...task, status: 'CLAIMED' } : task,
              );
            }

            const firstPage = old.pages[0];
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  data: [claimedTask as TaskDto, ...firstPage.data],
                  meta: {
                    ...firstPage.meta,
                    pagination: {
                      ...firstPage.meta.pagination,
                      total: firstPage.meta.pagination.total + 1,
                    },
                  },
                },
                ...old.pages.slice(1),
              ],
            };
          },
        );
      }

      return { previousTaskLists, previousMyTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTaskLists) {
        for (const [key, data] of context.previousTaskLists) {
          queryClient.setQueryData(key, data);
        }
      }

      if (context?.previousMyTasks) {
        queryClient.setQueryData(['tasks', 'me'], context.previousMyTasks);
      }
    },
    onSuccess: (response, taskId) => {
      queryClient.setQueriesData<InfiniteData<TaskListResponse, string | undefined>>(
        { queryKey: ['tasks'] },
        (old) =>
          updateInfiniteTaskPages(old, (task) => (task.id === taskId ? response.data : task)),
      );
      queryClient.setQueryData<InfiniteData<TaskListResponse, string | undefined>>(
        ['tasks', 'me'],
        (old) => {
          if (!old) return old;
          return updateInfiniteTaskPages(old, (task) =>
            task.id === taskId ? response.data : task,
          );
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskDetailResponse,
    Error,
    { taskId: string; status: string },
    {
      previousTaskLists: InfiniteTaskSnapshot[];
      previousMyTasks?: InfiniteData<TaskListResponse, string | undefined>;
    }
  >({
    mutationFn: ({ taskId, status }) =>
      apiClient<TaskDetailResponse>(`/api/v1/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      const previousTaskLists = queryClient.getQueriesData<
        InfiniteData<TaskListResponse, string | undefined>
      >({ queryKey: ['tasks'] });
      const previousMyTasks = queryClient.getQueryData<
        InfiniteData<TaskListResponse, string | undefined>
      >(['tasks', 'me']);

      queryClient.setQueriesData<InfiniteData<TaskListResponse, string | undefined>>(
        { queryKey: ['tasks'] },
        (old) =>
          updateInfiniteTaskPages(old, (task) =>
            task.id === taskId ? { ...task, status: status as TaskDto['status'] } : task,
          ),
      );

      return { previousTaskLists, previousMyTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTaskLists) {
        for (const [key, data] of context.previousTaskLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['tasks', 'me'], context.previousMyTasks);
      }
    },
    onSuccess: (response, { taskId }) => {
      queryClient.setQueriesData<InfiniteData<TaskListResponse, string | undefined>>(
        { queryKey: ['tasks'] },
        (old) =>
          updateInfiniteTaskPages(old, (task) => (task.id === taskId ? response.data : task)),
      );
      queryClient.setQueryData<InfiniteData<TaskListResponse, string | undefined>>(
        ['tasks', 'me'],
        (old) => {
          if (!old) return old;
          return updateInfiniteTaskPages(old, (task) =>
            task.id === taskId ? response.data : task,
          );
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskDetailResponse,
    Error,
    {
      title: string;
      description: string;
      domain: string;
      difficulty: string;
      estimatedEffort: string;
    }
  >({
    mutationFn: (data) =>
      apiClient<TaskDetailResponse>('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskDetailResponse,
    Error,
    {
      taskId: string;
      data: {
        title?: string;
        description?: string;
        domain?: string;
        difficulty?: string;
        estimatedEffort?: string;
      };
    }
  >({
    mutationFn: ({ taskId, data }) =>
      apiClient<TaskDetailResponse>(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRetireTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDetailResponse, Error, string>({
    mutationFn: (taskId: string) =>
      apiClient<TaskDetailResponse>(`/api/v1/tasks/${taskId}/retire`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
