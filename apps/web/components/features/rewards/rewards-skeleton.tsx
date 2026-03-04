import { RewardsHeroSkeleton } from './rewards-hero';

export function RewardsSkeleton() {
  return (
    <div role="status" aria-label="Loading rewards page">
      <RewardsHeroSkeleton />
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[240px]" />
        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xl)]">
          <div className="skeleton h-[80px] w-full" />
          <div className="skeleton h-[80px] w-full" />
          <div className="skeleton h-[60px] w-[90%]" />
        </div>
      </div>
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[200px]" />
        <div className="skeleton mt-[var(--spacing-md)] h-[320px] w-full rounded-[12px]" />
      </div>
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[220px]" />
        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
          <div className="skeleton h-[140px] w-full rounded-[12px]" />
          <div className="skeleton h-[140px] w-full rounded-[12px]" />
          <div className="skeleton h-[140px] w-full rounded-[12px]" />
          <div className="skeleton h-[140px] w-full rounded-[12px]" />
        </div>
      </div>
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[120px]" />
        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xs)]">
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}
