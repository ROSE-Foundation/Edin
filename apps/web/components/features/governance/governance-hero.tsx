export function GovernanceHero() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      aria-label="Governance roadmap introduction"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-domain-governance">
          Progressive Decentralization
        </h1>
        <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-brand-secondary">
          How governance authority transfers from the founding team to the community — with specific
          milestones, transparent timelines, and no shortcuts.
        </p>
      </div>
    </section>
  );
}

export function GovernanceHeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      role="status"
      aria-label="Loading governance hero"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[40px] w-[400px] max-w-full" />
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}
