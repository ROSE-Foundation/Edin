interface ScalingLawExplainerProps {
  overview: string;
}

export function ScalingLawExplainer({ overview }: ScalingLawExplainerProps) {
  const paragraphs = overview.split('\n\n');

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Scaling law explanation"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
        The Scaling-Law Model
      </h2>
      <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-xl)]">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="font-serif text-[17px] leading-[1.65] text-text-primary">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
