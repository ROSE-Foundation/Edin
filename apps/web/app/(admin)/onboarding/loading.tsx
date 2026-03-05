export default function OnboardingLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
          <div className="skeleton h-[32px] w-[250px]" />
          <div className="skeleton h-[40px] w-[160px] rounded-[var(--radius-md)]" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
          {/* Header skeleton */}
          <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
            {[180, 100, 130, 130, 110, 90].map((w, i) => (
              <div key={i} className={`w-[${w}px]`}>
                <div className="skeleton h-[14px] w-[80%]" />
              </div>
            ))}
          </div>
          {/* Row skeletons */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center border-b border-surface-border px-[var(--spacing-md)] last:border-b-0"
              style={{ minHeight: '48px' }}
            >
              <div className="w-[180px] skeleton h-[20px]" />
              <div className="w-[100px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
              <div className="w-[130px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[130px] flex items-center gap-[4px] ml-[var(--spacing-sm)]">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="skeleton h-[10px] w-[10px] rounded-full" />
                ))}
              </div>
              <div className="w-[110px] skeleton h-[16px] ml-[var(--spacing-sm)]" />
              <div className="w-[90px] skeleton h-[24px] rounded-full ml-[var(--spacing-sm)]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
