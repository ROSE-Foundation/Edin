'use client';

import type { OnboardingMilestone } from '@edin/shared';

const MILESTONES = [
  {
    type: 'ACCOUNT_ACTIVATED',
    label: 'Account activated',
    pendingLabel: 'Your account will be set up shortly',
  },
  {
    type: 'BUDDY_ASSIGNED',
    label: 'Buddy paired',
    pendingLabel: 'Your buddy will be paired with you soon',
  },
  {
    type: 'FIRST_TASK_VIEWED',
    label: 'First task explored',
    pendingLabel: 'A meaningful first task awaits you',
  },
  {
    type: 'FIRST_TASK_CLAIMED',
    label: 'Task claimed',
    pendingLabel: 'You will be able to claim your first task',
  },
  {
    type: 'FIRST_CONTRIBUTION_SUBMITTED',
    label: 'First contribution',
    pendingLabel: 'Your first contribution will mark the beginning',
  },
] as const;

interface IgnitionProgressProps {
  milestones: OnboardingMilestone[];
  isExpired: boolean;
  isLoading: boolean;
}

export function IgnitionProgress({ milestones, isExpired, isLoading }: IgnitionProgressProps) {
  if (isLoading) {
    return <IgnitionProgressSkeleton />;
  }

  const completedTypes = new Set(milestones.map((m) => m.milestoneType));
  const firstPendingIndex = MILESTONES.findIndex((m) => !completedTypes.has(m.type));

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <h3 className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
        Your Journey
      </h3>

      {isExpired && (
        <p className="mt-[var(--spacing-sm)] font-serif text-[14px] leading-[1.65] text-brand-secondary">
          Complete at your own pace — there is no rush.
        </p>
      )}

      {/* Desktop: horizontal step indicator */}
      <div className="mt-[var(--spacing-md)] hidden sm:block">
        <div className="flex items-start justify-between">
          {MILESTONES.map((milestone, index) => {
            const isCompleted = completedTypes.has(milestone.type);
            const isCurrent = index === firstPendingIndex && !isExpired;

            return (
              <div key={milestone.type} className="flex flex-1 flex-col items-center">
                {/* Connector + dot row */}
                <div className="flex w-full items-center">
                  {/* Left connector */}
                  {index > 0 && (
                    <div
                      className={`h-[2px] flex-1 ${
                        completedTypes.has(MILESTONES[index - 1].type)
                          ? 'bg-brand-accent'
                          : 'bg-surface-border'
                      }`}
                    />
                  )}
                  {index === 0 && <div className="flex-1" />}

                  {/* Milestone dot */}
                  <div
                    className={`relative flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${
                      isCompleted
                        ? 'bg-brand-accent'
                        : isCurrent
                          ? 'border-2 border-brand-accent bg-transparent'
                          : 'border-2 border-surface-border bg-transparent'
                    } ${isCurrent && !isExpired ? 'animate-pulse' : ''}`}
                  >
                    {isCompleted && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Right connector */}
                  {index < MILESTONES.length - 1 && (
                    <div
                      className={`h-[2px] flex-1 ${
                        isCompleted ? 'bg-brand-accent' : 'bg-surface-border'
                      }`}
                    />
                  )}
                  {index === MILESTONES.length - 1 && <div className="flex-1" />}
                </div>

                {/* Label */}
                <span
                  className={`mt-[var(--spacing-xs)] text-center font-serif text-[13px] leading-[1.4] ${
                    isCompleted
                      ? 'text-brand-primary'
                      : isCurrent
                        ? 'text-brand-primary'
                        : 'text-brand-secondary/60'
                  }`}
                >
                  {isCompleted ? milestone.label : milestone.pendingLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: simplified dots only */}
      <div className="mt-[var(--spacing-md)] flex items-center justify-center gap-[var(--spacing-sm)] sm:hidden">
        {MILESTONES.map((milestone, index) => {
          const isCompleted = completedTypes.has(milestone.type);
          const isCurrent = index === firstPendingIndex && !isExpired;

          return (
            <div
              key={milestone.type}
              className={`h-[10px] w-[10px] rounded-full ${
                isCompleted
                  ? 'bg-brand-accent'
                  : isCurrent
                    ? 'border-2 border-brand-accent animate-pulse'
                    : 'border-2 border-surface-border'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function IgnitionProgressSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <div className="skeleton h-[14px] w-[100px]" />
      <div className="mt-[var(--spacing-md)] hidden sm:flex items-center justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && <div className="h-[2px] flex-1 bg-surface-border" />}
              {i === 0 && <div className="flex-1" />}
              <div className="skeleton h-[20px] w-[20px] shrink-0 rounded-full" />
              {i < 4 && <div className="h-[2px] flex-1 bg-surface-border" />}
              {i === 4 && <div className="flex-1" />}
            </div>
            <div className="skeleton mt-[var(--spacing-xs)] h-[13px] w-[80px]" />
          </div>
        ))}
      </div>
      <div className="mt-[var(--spacing-md)] flex items-center justify-center gap-[var(--spacing-sm)] sm:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-[10px] w-[10px] rounded-full" />
        ))}
      </div>
    </div>
  );
}
