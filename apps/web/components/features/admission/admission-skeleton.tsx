export function AdmissionSkeleton() {
  return (
    <div role="status" aria-label="Loading application form">
      {/* Hero skeleton */}
      <section className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]">
        <div className="mx-auto max-w-[1200px] text-center">
          <div className="skeleton mx-auto h-[40px] w-[360px] max-w-full" />
          <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
            <div className="skeleton mx-auto h-[20px] w-full" />
            <div className="skeleton mx-auto h-[20px] w-[80%]" />
          </div>
        </div>
      </section>

      {/* Form skeleton */}
      <div className="mx-auto max-w-[600px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="space-y-[var(--spacing-lg)]">
          {/* Name field */}
          <div>
            <div className="skeleton mb-[var(--spacing-sm)] h-[16px] w-[60px]" />
            <div className="skeleton h-[44px] w-full" />
          </div>
          {/* Email field */}
          <div>
            <div className="skeleton mb-[var(--spacing-sm)] h-[16px] w-[80px]" />
            <div className="skeleton h-[44px] w-full" />
          </div>
          {/* Domain selector */}
          <div>
            <div className="skeleton mb-[var(--spacing-sm)] h-[16px] w-[120px]" />
            <div className="skeleton h-[44px] w-full" />
          </div>
          {/* Statement */}
          <div>
            <div className="skeleton mb-[var(--spacing-sm)] h-[16px] w-[160px]" />
            <div className="skeleton h-[88px] w-full" />
          </div>
          {/* Submit button */}
          <div className="skeleton h-[44px] w-[180px]" />
        </div>
      </div>
    </div>
  );
}
