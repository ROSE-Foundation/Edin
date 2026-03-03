export function RosterSkeleton() {
  return (
    <div role="status" aria-label="Loading contributor roster">
      {/* Filter bar skeleton */}
      <div className="space-y-[var(--spacing-md)]">
        <div className="flex gap-[var(--spacing-sm)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-[36px] w-[90px] rounded-full" />
          ))}
        </div>
        <div className="skeleton h-[40px] w-full rounded-[var(--radius-md)]" />
      </div>

      {/* Grid skeleton */}
      <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[#E8E6E1] bg-surface-raised p-[var(--spacing-md)]"
          >
            <div className="flex items-start gap-[var(--spacing-md)]">
              <div className="skeleton h-[64px] w-[64px] shrink-0 rounded-full" />
              <div className="flex-1 space-y-[var(--spacing-sm)]">
                <div className="skeleton h-[24px] w-[140px]" />
                <div className="flex gap-[var(--spacing-xs)]">
                  <div className="skeleton h-[20px] w-[80px] rounded-full" />
                  <div className="skeleton h-[20px] w-[70px] rounded-full" />
                </div>
                <div className="skeleton h-[36px] w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
