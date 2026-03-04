interface StatCardProps {
  label: string;
  value: string | number;
  context: string;
}

export function StatCard({ label, value, context }: StatCardProps) {
  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <p className="font-sans text-[14px] leading-[1.4] font-medium text-brand-secondary">
        {label}
      </p>
      <p className="mt-[var(--spacing-sm)] font-serif text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] font-bold text-brand-primary">
        {value}
      </p>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] leading-[1.4] text-brand-secondary">
        {context}
      </p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]"
      role="status"
      aria-label="Loading metric"
    >
      <div className="skeleton h-[16px] w-[120px]" />
      <div className="skeleton mt-[var(--spacing-sm)] h-[36px] w-[80px]" />
      <div className="skeleton mt-[var(--spacing-xs)] h-[14px] w-[160px]" />
    </div>
  );
}
