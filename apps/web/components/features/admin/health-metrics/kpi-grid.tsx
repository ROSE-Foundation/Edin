'use client';

import type { KpiMetric } from '@edin/shared';

interface KpiGridProps {
  title: string;
  kpis: KpiMetric[];
}

function KpiCard({ kpi }: { kpi: KpiMetric }) {
  const ratio = kpi.target !== null && kpi.value !== null ? kpi.value / kpi.target : null;
  const statusColor =
    ratio === null
      ? 'text-text-primary'
      : ratio >= 1
        ? 'text-green-700'
        : ratio >= 0.8
          ? 'text-text-primary'
          : 'text-red-700';

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-sans text-[13px] font-medium text-text-secondary">{kpi.label}</h4>
          <p className={`mt-[var(--spacing-xs)] text-[24px] font-bold ${statusColor}`}>
            {kpi.value !== null ? kpi.value : 'N/A'}
            {kpi.value !== null && kpi.unit && (
              <span className="ml-1 text-[12px] font-normal text-text-secondary">{kpi.unit}</span>
            )}
          </p>
        </div>
        {kpi.target !== null && (
          <span className="rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] text-text-secondary">
            Target: {kpi.target}
          </span>
        )}
      </div>
      <p className="mt-[var(--spacing-xs)] font-serif text-[12px] text-text-secondary">
        {kpi.editorialContext}
      </p>
      <p className="mt-[var(--spacing-xs)] font-sans text-[11px] text-text-secondary opacity-60">
        {kpi.frequency}
      </p>
    </div>
  );
}

export function KpiGrid({ title, kpis }: KpiGridProps) {
  if (kpis.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-[18px] font-bold text-text-primary">{title}</h2>
      <div className="mt-[var(--spacing-md)] grid gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}
