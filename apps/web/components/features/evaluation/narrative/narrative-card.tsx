'use client';

interface NarrativeCardProps {
  narrative: string | null;
  contributionTitle: string;
  contributionType: string;
  sourceRef: string;
  completedAt: string | null;
  domainAccentColor?: string;
}

export function NarrativeCard({
  narrative,
  contributionTitle,
  contributionType,
  sourceRef,
  completedAt,
  domainAccentColor = 'var(--color-accent-primary)',
}: NarrativeCardProps) {
  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const typeLabel =
    contributionType === 'PULL_REQUEST'
      ? 'Pull Request'
      : contributionType === 'DOCUMENTATION'
        ? 'Documentation'
        : 'Commit';

  return (
    <article
      role="article"
      aria-label={`AI evaluation for ${contributionTitle}`}
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised shadow-[var(--shadow-card)]"
    >
      <div
        className="absolute left-0 top-0 h-full w-[4px]"
        style={{ backgroundColor: domainAccentColor }}
        aria-hidden="true"
      />
      <div className="p-[var(--spacing-xl)] pl-[calc(var(--spacing-xl)+8px)]">
        <div className="mb-[var(--spacing-md)] flex items-baseline gap-[var(--spacing-sm)]">
          <span className="font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
            {typeLabel}
          </span>
          {formattedDate && (
            <>
              <span className="text-[12px] text-text-secondary" aria-hidden="true">
                &middot;
              </span>
              <time
                className="font-sans text-[12px] text-text-secondary"
                dateTime={completedAt ?? undefined}
              >
                {formattedDate}
              </time>
            </>
          )}
        </div>

        <h2 className="mb-[var(--spacing-md)] font-serif text-[20px] font-bold leading-[1.3] text-text-primary">
          {contributionTitle}
        </h2>

        {narrative ? (
          <p className="font-serif text-[17px] leading-[1.65] text-text-primary">{narrative}</p>
        ) : (
          <p className="font-sans text-[15px] italic text-text-secondary">
            Evaluation narrative is not available.
          </p>
        )}

        <p className="mt-[var(--spacing-md)] font-mono text-[13px] text-text-secondary">
          {sourceRef}
        </p>
      </div>
    </article>
  );
}
