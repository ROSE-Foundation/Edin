'use client';

import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useRetireTask } from '../../../../hooks/use-tasks';
import { TaskStatusBadge } from '../../../../components/features/task/task-status-badge';
import { CreateTaskForm } from '../../../../components/features/task/create-task-form';
import { useToast } from '../../../../components/ui/toast';
import { DOMAIN_DETAILS } from '@edin/shared';
import type { TaskDto } from '@edin/shared';
import { ToastProvider } from '../../../../components/ui/toast';

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

function AdminTaskRow({
  task,
  onEdit,
  onRetire,
  isRetirePending,
}: {
  task: TaskDto;
  onEdit: (task: TaskDto) => void;
  onRetire: (taskId: string) => void;
  isRetirePending: boolean;
}) {
  const domainDetail = DOMAIN_DETAILS[task.domain as keyof typeof DOMAIN_DETAILS];
  const accentColor = domainDetail?.accentColor ?? '#666';

  return (
    <div className="flex flex-col gap-[var(--spacing-sm)] rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-[var(--spacing-sm)]">
          <h3 className="font-sans text-[14px] font-medium text-text-primary">{task.title}</h3>
          <span
            className="inline-flex items-center rounded-full px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            {task.domain}
          </span>
          <span className="font-sans text-[11px] text-text-secondary">
            {DIFFICULTY_LABELS[task.difficulty]}
          </span>
        </div>
        <p className="mt-[var(--spacing-xs)] line-clamp-1 font-serif text-[13px] text-text-secondary">
          {task.description}
        </p>
      </div>
      <div className="flex items-center gap-[var(--spacing-sm)]">
        <TaskStatusBadge status={task.status} />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="inline-flex min-h-[44px] items-center rounded-[8px] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] font-sans text-[13px] font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-sunken motion-reduce:transition-none"
        >
          Edit
        </button>
        {task.status !== 'RETIRED' && (
          <button
            type="button"
            onClick={() => onRetire(task.id)}
            disabled={isRetirePending}
            className="inline-flex min-h-[44px] items-center rounded-[8px] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] font-sans text-[13px] font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-sunken disabled:opacity-50 motion-reduce:transition-none"
          >
            {isRetirePending ? 'Retiring...' : 'Retire'}
          </button>
        )}
      </div>
    </div>
  );
}

function AdminTasksContent() {
  const [showRetired, setShowRetired] = useState(false);
  const [retiringTaskId, setRetiringTaskId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const { toast } = useToast();

  const { tasks: availableTasks, isPending } = useTasks({});
  const { tasks: retiredTasks, isPending: isRetiredPending } = useTasks(
    showRetired ? { status: 'RETIRED' } : {},
  );

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const retireMutation = useRetireTask();

  const allTasks = showRetired ? [...availableTasks, ...retiredTasks] : availableTasks;
  const uniqueTasks = Array.from(new Map(allTasks.map((t) => [t.id, t])).values());

  const handleCreate = (data: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  }) => {
    createMutation.mutate(data, {
      onSuccess: () => toast({ title: 'Task created.' }),
      onError: (error) => toast({ title: error.message, variant: 'error' }),
    });
  };

  const handleUpdate = (data: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  }) => {
    if (!editingTask) return;

    updateMutation.mutate(
      {
        taskId: editingTask.id,
        data,
      },
      {
        onSuccess: () => {
          toast({ title: 'Task updated.' });
          setEditingTask(null);
        },
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  const handleRetire = (taskId: string) => {
    setRetiringTaskId(taskId);
    retireMutation.mutate(taskId, {
      onSuccess: () => {
        toast({ title: 'Task retired.' });
        setRetiringTaskId(undefined);
      },
      onError: (error) => {
        toast({ title: error.message, variant: 'error' });
        setRetiringTaskId(undefined);
      },
    });
  };

  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <h1 className="font-serif text-[28px] font-bold text-text-primary">Task Management</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-text-secondary">
          Create, edit, and manage contribution menu tasks.
        </p>

        <div className="mt-[var(--spacing-2xl)]">
          <CreateTaskForm
            onSubmit={editingTask ? handleUpdate : handleCreate}
            isPending={createMutation.isPending || updateMutation.isPending}
            initialValues={
              editingTask
                ? {
                    title: editingTask.title,
                    description: editingTask.description,
                    domain: editingTask.domain,
                    difficulty: editingTask.difficulty,
                    estimatedEffort: editingTask.estimatedEffort,
                  }
                : undefined
            }
            submitLabel={editingTask ? 'Save Changes' : 'Create Task'}
            heading={editingTask ? 'Edit Task' : 'Create New Task'}
            onCancel={editingTask ? () => setEditingTask(null) : undefined}
          />
        </div>

        <div className="mt-[var(--spacing-2xl)]">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-[18px] font-medium text-text-primary">All Tasks</h2>
            <label className="flex items-center gap-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="rounded border-surface-subtle"
              />
              Show retired
            </label>
          </div>

          <div className="mt-[var(--spacing-md)]">
            {isPending || isRetiredPending ? (
              <div className="space-y-[var(--spacing-sm)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]"
                  >
                    <div className="flex items-center gap-[var(--spacing-sm)]">
                      <div className="skeleton h-[16px] w-[200px]" />
                      <div className="skeleton h-[18px] w-[60px] rounded-full" />
                    </div>
                    <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-full" />
                  </div>
                ))}
              </div>
            ) : uniqueTasks.length === 0 ? (
              <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-text-secondary">
                No tasks have been created yet.
              </p>
            ) : (
              <div className="space-y-[var(--spacing-sm)]">
                {uniqueTasks.map((task) => (
                  <AdminTaskRow
                    key={task.id}
                    task={task}
                    onEdit={setEditingTask}
                    onRetire={handleRetire}
                    isRetirePending={retireMutation.isPending && retiringTaskId === task.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminTasksPage() {
  return (
    <ToastProvider>
      <AdminTasksContent />
    </ToastProvider>
  );
}
