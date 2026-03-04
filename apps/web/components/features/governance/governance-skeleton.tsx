import { GovernanceHeroSkeleton } from './governance-hero';

export function GovernanceSkeleton() {
  return (
    <div role="status" aria-label="Loading governance page">
      <GovernanceHeroSkeleton />
      {/* Explainer skeleton */}
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[280px]" />
        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xl)]">
          <div className="skeleton h-[80px] w-full" />
          <div className="skeleton h-[80px] w-full" />
          <div className="skeleton h-[60px] w-[90%]" />
        </div>
      </div>
      {/* Timeline skeleton */}
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[200px]" />
        <div className="mt-[var(--spacing-xl)] space-y-[var(--spacing-lg)]">
          <div className="skeleton h-[120px] w-full rounded-[12px]" />
          <div className="skeleton h-[120px] w-full rounded-[12px]" />
          <div className="skeleton h-[120px] w-full rounded-[12px]" />
          <div className="skeleton h-[120px] w-full rounded-[12px]" />
        </div>
      </div>
      {/* Glossary skeleton */}
      <div className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="skeleton h-[24px] w-[120px]" />
        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xs)]">
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
          <div className="skeleton h-[48px] w-full rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}
