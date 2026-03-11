import { ROSE_CONCEPTS } from './rose-data';

export function RoseDetails() {
  return (
    <>
      {/* The Problem */}
      <section className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]" aria-label="The Problem">
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            The Problem Rose Solves
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-brand-primary">
            Today&apos;s financial system runs on infrastructure designed decades ago. Settlement
            takes days (T+2), capital sits idle overnight, and the system&apos;s slow reaction times
            amplify crises. Trillions in value are lost to friction, counterparty risk, and
            inefficiency. These structural flaws disproportionately affect smaller participants
            while concentrating advantages among large institutions.
          </p>
        </div>
      </section>

      {/* The Rose Approach */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="The Rose Approach"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            The Rose Approach
          </h2>
          <div className="mt-[var(--spacing-xl)] flex flex-col gap-[var(--spacing-lg)]">
            {ROSE_CONCEPTS.map((concept, index) => (
              <div
                key={concept.title}
                className="relative flex gap-[var(--spacing-md)] pl-[var(--spacing-sm)]"
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-brand-accent font-mono text-[12px] font-bold text-surface-raised">
                    {index + 1}
                  </div>
                  {index < ROSE_CONCEPTS.length - 1 && (
                    <div className="mt-[var(--spacing-xs)] h-full w-[1px] bg-surface-border" />
                  )}
                </div>
                <div className="pb-[var(--spacing-md)]">
                  <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                    {concept.title}
                  </h3>
                  <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
                    {concept.fullDescription}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Broader Vision */}
      <section
        className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="The Broader Vision"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            The Broader Vision
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-brand-primary">
            Rose is more than a financial engine. The efficiency gains and yield captured by the
            Alpha Engine are designed to fund commons — free water, free energy, and peace-building
            initiatives. The project aims to shift the economy from extraction to regeneration.
          </p>
        </div>
      </section>

      {/* Foundation Structure */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="Foundation Structure"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            Foundation Structure
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-brand-primary">
            Rose operates under the IOUR Foundation, a Belgian public benefit foundation. All
            intellectual property is held by the foundation. Commercial entities may be licensed to
            operate the technology, but always under conditions set by the foundation&apos;s
            governance.
          </p>
        </div>
      </section>
    </>
  );
}
