'use client';

import { BuddyWelcomeCard } from './buddy-welcome-card';
import { FirstTaskCard } from './first-task-card';
import { IgnitionProgress } from './ignition-progress';
import {
  useBuddyAssignment,
  useFirstTaskRecommendation,
} from '../../../hooks/use-buddy-assignment';
import { useOnboardingStatus } from '../../../hooks/use-onboarding-status';

export function OnboardingWelcome() {
  const { buddyAssignment, isLoading: buddyLoading } = useBuddyAssignment();
  const { task, isLoading: taskLoading } = useFirstTaskRecommendation();
  const { onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus();

  const hasActiveBuddyAssignment =
    buddyAssignment !== null && buddyAssignment.isActive && !buddyAssignment.isExpired;

  const hasOnboarding = onboardingStatus !== null && onboardingStatus.ignitionStartedAt !== null;

  const showOnboardingProgress =
    hasOnboarding && (onboardingStatus!.isWithin72Hours || !onboardingStatus!.isComplete);

  if (
    !buddyLoading &&
    !taskLoading &&
    !onboardingLoading &&
    !hasActiveBuddyAssignment &&
    !showOnboardingProgress
  ) {
    return null;
  }

  const buddy = buddyAssignment?.buddy ?? null;

  return (
    <section className="space-y-[var(--spacing-md)]">
      <h2 className="font-serif text-[20px] font-bold text-text-primary">
        Welcome to the community
      </h2>

      {(showOnboardingProgress || onboardingLoading) && (
        <IgnitionProgress
          milestones={onboardingStatus?.milestones ?? []}
          isExpired={onboardingStatus?.isExpired ?? false}
          isLoading={onboardingLoading}
        />
      )}

      <div className="grid gap-[var(--spacing-md)] md:grid-cols-2">
        <BuddyWelcomeCard buddy={buddy} isLoading={buddyLoading} />
        <FirstTaskCard task={task} isLoading={taskLoading} />
      </div>
    </section>
  );
}
