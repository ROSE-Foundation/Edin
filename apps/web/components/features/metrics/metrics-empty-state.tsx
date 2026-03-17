export function MetricsEmptyState() {
  return (
    <section
      className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      aria-label="No metrics data available"
    >
      <div className="text-center">
        <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
          Metrics are on the way
        </h2>
        <p className="mx-auto mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.65] text-text-secondary">
          As our community grows, you&rsquo;ll see real-time metrics reflecting contributor activity
          across all four domains. These placeholders preview what each metric will show once data
          starts flowing.
        </p>
      </div>

      <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2">
        <MetricPlaceholder
          label="Active Contributors"
          description="How many contributors are currently active across the platform."
        />
        <MetricPlaceholder
          label="Contribution Velocity"
          description="Weekly contribution rhythm across code, analysis, and governance work."
        />
        <MetricPlaceholder
          label="Retention Rate"
          description="How many contributors remain active after their first month."
        />
        <MetricPlaceholder
          label="Total Contributors"
          description="Total contributor footprint across all four domains."
        />
      </div>

      <div className="mt-[var(--spacing-xl)] rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <h3 className="font-serif text-[clamp(1.125rem,2.5vw,1.25rem)] leading-[1.3] font-semibold text-text-primary">
          Domain Distribution
        </h3>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-text-secondary">
          This chart will show how contributors are distributed across Technology, Finance, Impact,
          and Governance.
        </p>
      </div>
    </section>
  );
}

interface MetricPlaceholderProps {
  label: string;
  description: string;
}

function MetricPlaceholder({ label, description }: MetricPlaceholderProps) {
  return (
    <div className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <p className="font-sans text-[14px] leading-[1.4] font-medium text-text-secondary">{label}</p>
      <p className="mt-[var(--spacing-sm)] font-serif text-[clamp(1.5rem,3.5vw,2rem)] leading-[1.1] font-bold text-text-primary">
        --
      </p>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] leading-[1.5] text-text-secondary">
        {description}
      </p>
    </div>
  );
}
