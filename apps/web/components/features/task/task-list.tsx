'use client';

import { useEffect, useRef } from 'react';
import type { TaskDto } from '@edin/shared';
import { TaskCard } from './task-card';

interface TaskListProps {
  tasks: TaskDto[];
  onClaim?: (taskId: string) => void;
  isClaimPending?: boolean;
  claimingTaskId?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function TaskList({
  tasks,
  onClaim,
  isClaimPending,
  claimingTaskId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: TaskListProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (tasks.length === 0) {
    return (
      <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-text-secondary">
        Available tasks will appear here as they are created by Working Group Leads
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Task list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onClaim={onClaim}
          isClaimPending={isClaimPending && claimingTaskId === task.id}
        />
      ))}
      {hasNextPage && <div ref={observerRef} className="h-[1px]" aria-hidden="true" />}
    </div>
  );
}
