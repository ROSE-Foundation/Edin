import { RosterSkeleton } from '../../../components/features/roster/roster-skeleton';

export default function ContributorRosterLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <section className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]">
        <div className="mx-auto max-w-[1200px] text-center">
          <div className="skeleton mx-auto h-[40px] w-[300px] max-w-full" />
          <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
            <div className="skeleton mx-auto h-[20px] w-full" />
            <div className="skeleton mx-auto h-[20px] w-[80%]" />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <RosterSkeleton />
      </div>
    </main>
  );
}
