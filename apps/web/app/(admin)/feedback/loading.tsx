import { StatCardSkeleton } from '../../../components/features/metrics/stat-card';

export default function FeedbackMonitoringLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="skeleton h-[32px] w-[250px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[20px] w-[350px]" />

        <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="mt-[var(--spacing-xl)]">
          <div className="skeleton h-[40px] w-[300px]" />
        </div>

        <div className="mt-[var(--spacing-xl)]">
          <div className="skeleton mb-[var(--spacing-md)] h-[24px] w-[160px]" />
          <div className="rounded-[12px] border border-surface-border bg-surface-raised">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-[var(--spacing-md)] border-b border-surface-border p-[var(--spacing-md)] last:border-b-0"
              >
                <div className="skeleton h-[16px] w-[120px]" />
                <div className="skeleton h-[16px] flex-1" />
                <div className="skeleton h-[16px] w-[80px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
