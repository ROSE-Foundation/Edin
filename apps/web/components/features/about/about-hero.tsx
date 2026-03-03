export function AboutHero() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      aria-label="About Edin"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
          Our Domains
        </h1>
        <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-brand-secondary">
          Edin is built on four pillars of expertise. Each domain represents a critical dimension of
          our platform — from the code that powers it to the governance that shapes its future.
        </p>
      </div>
    </section>
  );
}

export function AboutHeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      role="status"
      aria-label="Loading about section"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[40px] w-[300px] max-w-full" />
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}
