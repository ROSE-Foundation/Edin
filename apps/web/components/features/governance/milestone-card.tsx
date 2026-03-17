'use client';

import * as Accordion from '@radix-ui/react-accordion';
import type { GovernancePhase } from '@edin/shared';

interface MilestoneCardProps {
  phase: GovernancePhase;
  colors: { dot: string; border: string; bg: string; label: string };
}

export function MilestoneCard({ phase, colors }: MilestoneCardProps) {
  return (
    <Accordion.Item value={`phase-${phase.id}`} className="relative pl-[40px]">
      {/* Timeline dot */}
      <div
        className={`absolute left-[8px] top-[18px] h-[16px] w-[16px] rounded-full ${colors.dot} ring-4 ring-surface-base`}
        aria-hidden="true"
      />

      <Accordion.Header asChild>
        <h3>
          <Accordion.Trigger
            className={`group flex w-full min-h-[48px] cursor-pointer flex-col items-start rounded-[12px] border ${colors.border} ${colors.bg} px-[var(--spacing-md)] py-[var(--spacing-md)] text-left transition-colors hover:opacity-90`}
          >
            <div className="flex w-full items-center justify-between gap-[var(--spacing-sm)]">
              <div className="flex items-center gap-[var(--spacing-sm)]">
                <span className="font-serif text-[17px] font-semibold text-text-primary">
                  Phase {phase.id}: {phase.name}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-[8px] py-[2px] text-[11px] font-medium ${
                    phase.status === 'current'
                      ? 'bg-[#C4956A]/20 text-[#8B6B4A]'
                      : phase.status === 'completed'
                        ? 'bg-[#5A8A6B]/20 text-[#3D6B4A]'
                        : 'bg-[#5A7A8A]/20 text-[#3D5A6A]'
                  }`}
                >
                  {colors.label}
                </span>
              </div>
              <span
                className="shrink-0 text-[12px] text-text-secondary transition-transform duration-300 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              >
                &#9660;
              </span>
            </div>
            <span className="mt-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary">
              {phase.timelineRange}
            </span>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.5] text-text-primary/80">
              {phase.summary}
            </p>
          </Accordion.Trigger>
        </h3>
      </Accordion.Header>

      <Accordion.Content className="accordion-content overflow-hidden">
        <div
          className={`mt-[var(--spacing-sm)] rounded-b-[12px] border ${colors.border} border-t-0 px-[var(--spacing-md)] py-[var(--spacing-md)]`}
        >
          <p className="font-sans text-[13px] font-medium text-text-secondary">Governance model</p>
          <p className="mt-[var(--spacing-xs)] font-serif text-[15px] leading-[1.5] text-text-primary">
            {phase.governanceModel}
          </p>

          <p className="mt-[var(--spacing-md)] font-sans text-[13px] font-medium text-text-secondary">
            Key metrics
          </p>
          <ul className="mt-[var(--spacing-xs)] space-y-[var(--spacing-xs)]">
            {phase.keyMetrics.map((metric) => (
              <li
                key={metric.label}
                className="font-sans text-[13px] leading-[1.5] text-text-primary"
              >
                <span className="font-semibold">{metric.label}:</span> {metric.value}
              </li>
            ))}
          </ul>

          <p className="mt-[var(--spacing-md)] font-sans text-[13px] font-medium text-text-secondary">
            Governance capabilities
          </p>
          <ul className="mt-[var(--spacing-xs)] space-y-[var(--spacing-sm)]">
            {phase.milestones.map((milestone) => (
              <li key={milestone.capability} className="flex gap-[var(--spacing-sm)]">
                <span
                  className={`mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full ${colors.dot}`}
                  aria-hidden="true"
                />
                <div>
                  <span className="font-sans text-[14px] font-semibold text-text-primary">
                    {milestone.capability}
                  </span>
                  <p className="font-sans text-[13px] leading-[1.5] text-text-secondary">
                    {milestone.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
