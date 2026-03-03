import { AboutHeroSkeleton } from './about-hero';

export function AboutSkeleton() {
  return (
    <div role="status" aria-label="Loading about page">
      <AboutHeroSkeleton />
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="flex flex-col gap-[var(--spacing-2xl)]">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border-l-4 border-l-surface-border p-[var(--spacing-lg)]"
            >
              <div className="skeleton h-[28px] w-[200px]" />
              <div className="skeleton mt-[var(--spacing-xs)] h-[20px] w-[300px]" />
              <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                <div className="skeleton h-[16px] w-full" />
                <div className="skeleton h-[16px] w-full" />
                <div className="skeleton h-[16px] w-[80%]" />
              </div>
              <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-xs)]">
                <div className="skeleton h-[14px] w-[70%]" />
                <div className="skeleton h-[14px] w-[60%]" />
                <div className="skeleton h-[14px] w-[65%]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
