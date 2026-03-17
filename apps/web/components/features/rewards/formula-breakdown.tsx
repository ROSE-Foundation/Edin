import type { FormulaComponent } from '@edin/shared';

interface FormulaBreakdownProps {
  components: FormulaComponent[];
}

const COMPONENT_ICONS: Record<string, string> = {
  'AI Evaluation': '\u2699', // gear
  'Peer Feedback': '\u{1F91D}', // handshake
  'Task Complexity': '\u{1F4CA}', // bar chart
  'Domain Normalization': '\u2696', // balance
};

export function FormulaBreakdown({ components }: FormulaBreakdownProps) {
  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Scoring formula components"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
        What Shapes Your Score
      </h2>
      <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
        {components.map((component) => (
          <div
            key={component.name}
            className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]"
          >
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="text-[24px]" aria-hidden="true">
                {COMPONENT_ICONS[component.name] || '\u2022'}
              </span>
              <h3 className="font-sans text-[15px] font-semibold text-text-primary">
                {component.name}
              </h3>
              <span className="ml-auto rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] text-text-secondary">
                {component.qualitativeWeight}
              </span>
            </div>
            <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.6] text-text-primary">
              {component.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
