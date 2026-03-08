'use client';

import type { TaskDto } from '@edin/shared';
import { DOMAIN_DETAILS } from '@edin/shared';
import { TaskStatusBadge } from './task-status-badge';

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

interface MyTaskCardProps {
  task: TaskDto;
  onStartWorking?: (taskId: string) => void;
  isUpdatePending?: boolean;
}

export function MyTaskCard({ task, onStartWorking, isUpdatePending }: MyTaskCardProps) {
  const domainDetail = DOMAIN_DETAILS[task.domain as keyof typeof DOMAIN_DETAILS];
  const accentColor = domainDetail?.accentColor ?? '#666';

  return (
    <div
      role="listitem"
      className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-[var(--spacing-sm)] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="font-sans text-[15px] font-medium text-brand-primary">{task.title}</h3>
          <p className="mt-[var(--spacing-xs)] line-clamp-2 font-serif text-[14px] leading-[1.65] text-brand-secondary">
            {task.description}
          </p>
        </div>
        <div className="flex items-center gap-[var(--spacing-sm)]">
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      <div className="mt-[var(--spacing-sm)] flex flex-wrap items-center gap-[var(--spacing-sm)]">
        <span
          className="inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {task.domain}
        </span>
        <span className="font-sans text-[12px] text-brand-secondary">
          {DIFFICULTY_LABELS[task.difficulty] ?? task.difficulty}
        </span>
        <span className="font-sans text-[12px] text-brand-secondary">{task.estimatedEffort}</span>
      </div>

      {/* Status progression */}
      <div className="mt-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)]">
        <span
          className={`font-sans text-[12px] ${task.status === 'CLAIMED' || task.status === 'IN_PROGRESS' || task.status === 'COMPLETED' || task.status === 'EVALUATED' ? 'font-medium text-brand-primary' : 'text-brand-secondary/50'}`}
        >
          Claimed
        </span>
        <span className="text-brand-secondary/30">&rarr;</span>
        <span
          className={`font-sans text-[12px] ${task.status === 'IN_PROGRESS' || task.status === 'COMPLETED' || task.status === 'EVALUATED' ? 'font-medium text-brand-primary' : 'text-brand-secondary/50'}`}
        >
          In Progress
        </span>
        <span className="text-brand-secondary/30">&rarr;</span>
        <span
          className={`font-sans text-[12px] ${task.status === 'COMPLETED' || task.status === 'EVALUATED' ? 'font-medium text-brand-primary' : 'text-brand-secondary/50'}`}
        >
          Completed
        </span>
        <span className="text-brand-secondary/30">&rarr;</span>
        <span
          className={`font-sans text-[12px] ${task.status === 'EVALUATED' ? 'font-medium text-brand-primary' : 'text-brand-secondary/50'}`}
        >
          Evaluated
        </span>
      </div>

      {task.status === 'CLAIMED' && onStartWorking && (
        <div className="mt-[var(--spacing-md)]">
          <button
            type="button"
            onClick={() => onStartWorking(task.id)}
            disabled={isUpdatePending}
            className="inline-flex min-h-[44px] items-center rounded-[8px] bg-brand-accent px-[var(--spacing-md)] font-sans text-[14px] font-medium text-white transition-colors duration-200 hover:bg-brand-accent/90 disabled:opacity-50 motion-reduce:transition-none"
            aria-label={`Start working on: ${task.title}`}
          >
            {isUpdatePending ? 'Updating...' : 'Start Working'}
          </button>
        </div>
      )}
    </div>
  );
}
