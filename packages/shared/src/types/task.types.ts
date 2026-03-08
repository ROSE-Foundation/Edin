import type { Domain } from '../constants/domains.js';

export type TaskStatus =
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'RETIRED';

export type TaskDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  difficulty: TaskDifficulty;
  estimatedEffort: string;
  status: TaskStatus;
  sortOrder: number;
  claimedById: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderTasksDto {
  domain: Domain;
  tasks: Array<{ taskId: string; sortOrder: number }>;
}

export interface TasksReorderedEvent {
  eventType: 'task.reordered';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    domain: Domain;
    tasks: Array<{ taskId: string; sortOrder: number }>;
  };
}

export interface CreateTaskDto {
  title: string;
  description: string;
  domain: Domain;
  difficulty: TaskDifficulty;
  estimatedEffort: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  domain?: Domain;
  difficulty?: TaskDifficulty;
  estimatedEffort?: string;
}

export interface TaskListResponse {
  data: TaskDto[];
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

export interface TaskDetailResponse {
  data: TaskDto;
  meta: {
    timestamp: string;
    correlationId: string;
  };
}

export interface TaskClaimedEvent {
  eventType: 'task.claimed';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    taskId: string;
    contributorId: string;
    taskTitle: string;
  };
}

export interface TaskStatusChangedEvent {
  eventType: 'task.status-changed';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    taskId: string;
    previousStatus: TaskStatus;
    newStatus: TaskStatus;
    contributorId: string;
  };
}

export interface TaskCreatedEvent {
  eventType: 'task.created';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    taskId: string;
    title: string;
    domain: Domain;
    difficulty: TaskDifficulty;
  };
}

export interface TaskRetiredEvent {
  eventType: 'task.retired';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    taskId: string;
    title: string;
  };
}
