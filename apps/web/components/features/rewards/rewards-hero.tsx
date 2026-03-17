export function RewardsHero() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      aria-label="Reward methodology introduction"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-text-primary">
          How Rewards Work
        </h1>
        <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-text-secondary">
          Like a garden that grows richer with sustained care, your contributions compound over time
          — creating an accelerating trajectory of recognition.
        </p>
      </div>
    </section>
  );
}

export function RewardsHeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      role="status"
      aria-label="Loading rewards hero"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[40px] w-[360px] max-w-full" />
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}
