'use client';

import { useState } from 'react';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  sortOrder: number;
}

interface TaskPriorityListProps {
  tasks: TaskItem[];
  onReorder: (tasks: Array<{ taskId: string; sortOrder: number }>) => void;
  isPending: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  CLAIMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  EVALUATED: 'bg-gray-100 text-gray-800',
};

export function TaskPriorityList({ tasks, onReorder, isPending }: TaskPriorityListProps) {
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [hasChanges, setHasChanges] = useState(false);

  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setOrderedTasks(tasks);
    setHasChanges(false);
  }

  const moveTask = (index: number, direction: 'up' | 'down') => {
    const newTasks = [...orderedTasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newTasks.length) return;

    [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];

    setOrderedTasks(newTasks);
    setHasChanges(true);
  };

  const handleSave = () => {
    const reordered = orderedTasks.map((task, index) => ({
      taskId: task.id,
      sortOrder: index + 1,
    }));
    onReorder(reordered);
    setHasChanges(false);
  };

  if (tasks.length === 0) {
    return <p className="font-serif text-[14px] text-text-secondary">No tasks to prioritize.</p>;
  }

  return (
    <div role="region" aria-label="Task priority ordering">
      <div className="space-y-[var(--spacing-xs)]" role="list" aria-label="Tasks">
        {orderedTasks.map((task, index) => (
          <div
            key={task.id}
            role="listitem"
            className="flex items-center gap-[var(--spacing-md)] rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-sm)]"
          >
            <span className="w-[32px] text-center font-sans text-[14px] font-medium text-text-secondary">
              {index + 1}
            </span>
            <span className="flex-1 font-sans text-[14px] text-text-primary">{task.title}</span>
            <span
              className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium ${STATUS_BADGE[task.status] ?? 'bg-gray-100 text-gray-800'}`}
            >
              {task.status}
            </span>
            <div className="flex gap-[var(--spacing-xs)]">
              <button
                type="button"
                onClick={() => moveTask(index, 'up')}
                disabled={index === 0}
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[8px] border border-surface-subtle font-sans text-text-secondary transition-colors duration-200 hover:bg-surface-sunken disabled:opacity-30"
                aria-label={`Move ${task.title} up`}
              >
                &#9650;
              </button>
              <button
                type="button"
                onClick={() => moveTask(index, 'down')}
                disabled={index === orderedTasks.length - 1}
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[8px] border border-surface-subtle font-sans text-text-secondary transition-colors duration-200 hover:bg-surface-sunken disabled:opacity-30"
                aria-label={`Move ${task.title} down`}
              >
                &#9660;
              </button>
            </div>
          </div>
        ))}
      </div>
      {hasChanges && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="mt-[var(--spacing-md)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] font-sans text-[14px] font-medium text-white transition-colors duration-[var(--transition-fast)] hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Order'}
        </button>
      )}
    </div>
  );
}
