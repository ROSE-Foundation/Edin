'use client';

import type { TaskDto } from '@edin/shared';
import { DOMAIN_DETAILS } from '@edin/shared';
import { TaskStatusBadge } from './task-status-badge';

const DIFFICULTY_STYLES: Record<string, string> = {
  BEGINNER: 'border-semantic-success/30 text-semantic-success',
  INTERMEDIATE: 'border-[#C49A3C]/30 text-[#C49A3C]',
  ADVANCED: 'border-[#B06B6B]/30 text-[#B06B6B]',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

interface TaskCardProps {
  task: TaskDto;
  onClaim?: (taskId: string) => void;
  isClaimPending?: boolean;
}

export function TaskCard({ task, onClaim, isClaimPending }: TaskCardProps) {
  const domainDetail = DOMAIN_DETAILS[task.domain as keyof typeof DOMAIN_DETAILS];
  const accentColor = domainDetail?.accentColor ?? '#666';

  return (
    <div
      role="listitem"
      className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="flex flex-col gap-[var(--spacing-sm)] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="font-sans text-[15px] font-medium text-text-primary">{task.title}</h3>
          <p className="mt-[var(--spacing-xs)] line-clamp-2 font-serif text-[14px] leading-[1.65] text-text-secondary">
            {task.description}
          </p>
        </div>
        <div className="flex items-center gap-[var(--spacing-sm)] sm:flex-shrink-0">
          {task.status === 'AVAILABLE' && onClaim ? (
            <button
              type="button"
              onClick={() => onClaim(task.id)}
              disabled={isClaimPending}
              className="inline-flex min-h-[44px] items-center rounded-[8px] bg-accent-primary px-[var(--spacing-md)] font-sans text-[14px] font-medium text-white transition-colors duration-200 hover:bg-accent-primary/90 disabled:opacity-50 motion-reduce:transition-none"
              aria-label={`Claim task: ${task.title}`}
            >
              {isClaimPending ? 'Claiming...' : 'Claim'}
            </button>
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
        </div>
      </div>

      <div className="mt-[var(--spacing-sm)] flex flex-wrap items-center gap-[var(--spacing-sm)]">
        <span
          className="inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {task.domain}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${DIFFICULTY_STYLES[task.difficulty] ?? ''}`}
        >
          {DIFFICULTY_LABELS[task.difficulty] ?? task.difficulty}
        </span>
        <span className="font-sans text-[12px] text-text-secondary">{task.estimatedEffort}</span>
      </div>
    </div>
  );
}
