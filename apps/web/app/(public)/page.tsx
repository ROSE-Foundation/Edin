export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-base px-[var(--spacing-lg)]">
      <div className="max-w-2xl text-center">
        <h1 className="font-serif text-[40px] leading-[1.2] font-bold text-brand-primary mb-[var(--spacing-lg)]">
          Edin
        </h1>
        <p className="font-serif text-[17px] leading-[1.65] text-brand-secondary mb-[var(--spacing-xl)]">
          A curated contributor platform where every contribution is evaluated, recognized, and
          rewarded.
        </p>
        <div className="flex gap-[var(--spacing-md)] justify-center">
          <button className="px-[var(--spacing-lg)] py-[var(--spacing-sm)] bg-brand-accent text-surface-raised font-sans text-[15px] font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)] hover:opacity-90">
            Get Started
          </button>
          <button className="px-[var(--spacing-lg)] py-[var(--spacing-sm)] border border-brand-accent text-brand-accent font-sans text-[15px] font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent-subtle">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
