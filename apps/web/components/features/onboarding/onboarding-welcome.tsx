'use client';

import { BuddyWelcomeCard } from './buddy-welcome-card';
import { FirstTaskCard } from './first-task-card';
import {
  useBuddyAssignment,
  useFirstTaskRecommendation,
} from '../../../hooks/use-buddy-assignment';

export function OnboardingWelcome() {
  const { buddyAssignment, isLoading: buddyLoading } = useBuddyAssignment();
  const { task, isLoading: taskLoading } = useFirstTaskRecommendation();

  const hasActiveBuddyAssignment =
    buddyAssignment !== null && buddyAssignment.isActive && !buddyAssignment.isExpired;

  if (!buddyLoading && !taskLoading && !hasActiveBuddyAssignment) {
    return null;
  }

  const buddy = buddyAssignment?.buddy ?? null;

  return (
    <section className="space-y-[var(--spacing-md)]">
      <h2 className="font-serif text-[20px] font-bold text-brand-primary">
        Welcome to the community
      </h2>
      <div className="grid gap-[var(--spacing-md)] md:grid-cols-2">
        <BuddyWelcomeCard buddy={buddy} isLoading={buddyLoading} />
        <FirstTaskCard task={task} isLoading={taskLoading} />
      </div>
    </section>
  );
}
