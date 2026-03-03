import type { DomainManifesto } from '@edin/shared';

const DOMAIN_ACCENT_CLASSES: Record<string, { border: string; bgVar: string }> = {
  Technology: { border: 'border-l-domain-technology', bgVar: '--color-domain-technology' },
  Fintech: { border: 'border-l-domain-fintech', bgVar: '--color-domain-fintech' },
  Impact: { border: 'border-l-domain-impact', bgVar: '--color-domain-impact' },
  Governance: { border: 'border-l-domain-governance', bgVar: '--color-domain-governance' },
};

interface ManifestoSectionProps {
  manifesto: DomainManifesto;
}

export function ManifestoSection({ manifesto }: ManifestoSectionProps) {
  const accent = DOMAIN_ACCENT_CLASSES[manifesto.domain];

  return (
    <section
      className={`rounded-[var(--radius-lg)] border-l-4 ${accent?.border ?? ''} p-[var(--spacing-lg)]`}
      style={{
        backgroundColor: accent
          ? `color-mix(in srgb, var(${accent.bgVar}) 5%, transparent)`
          : undefined,
      }}
      aria-label={`${manifesto.title} domain`}
    >
      <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
        {manifesto.title}
      </h2>
      <p className="mt-[var(--spacing-xs)] font-sans text-[15px] leading-[1.5] font-normal text-brand-secondary">
        {manifesto.subtitle}
      </p>
      <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.6] text-brand-primary">
        {manifesto.content}
      </p>
      <ul className="mt-[var(--spacing-md)] space-y-[var(--spacing-xs)]">
        {manifesto.highlights.map((highlight) => (
          <li
            key={highlight}
            className="flex items-start gap-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary"
          >
            <span
              className="mt-[6px] block h-[6px] w-[6px] shrink-0 rounded-full"
              style={{
                backgroundColor: accent ? `var(${accent.bgVar})` : 'var(--color-brand-secondary)',
              }}
              aria-hidden="true"
            />
            {highlight}
          </li>
        ))}
      </ul>
    </section>
  );
}
