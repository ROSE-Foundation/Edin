import type { GovernanceGlossaryTerm } from '@edin/shared';

interface GovernanceGlossaryProps {
  terms: GovernanceGlossaryTerm[];
}

export function GovernanceGlossary({ terms }: GovernanceGlossaryProps) {
  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Governance glossary"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
        Glossary
      </h2>
      <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xs)]">
        {terms.map((item) => (
          <details
            key={item.term}
            className="group rounded-[8px] border border-surface-subtle bg-surface-raised"
          >
            <summary className="cursor-pointer px-[var(--spacing-md)] py-[var(--spacing-sm)] font-serif text-[15px] font-semibold text-text-primary list-none">
              <span className="flex items-center justify-between">
                {item.term}
                <span
                  className="text-[12px] text-text-secondary transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  &#9660;
                </span>
              </span>
            </summary>
            <div className="px-[var(--spacing-md)] pb-[var(--spacing-md)] font-sans text-[14px] leading-[1.6] text-text-secondary">
              {item.definition}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
