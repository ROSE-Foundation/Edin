'use client';

import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import type { GovernancePhase, PhaseStatus } from '@edin/shared';
import { MilestoneCard } from './milestone-card';

interface RoadmapTimelineProps {
  phases: GovernancePhase[];
}

const STATUS_COLORS: Record<
  PhaseStatus,
  { dot: string; border: string; bg: string; label: string }
> = {
  completed: {
    dot: 'bg-[#5A8A6B]',
    border: 'border-[#5A8A6B]/30',
    bg: 'bg-[#5A8A6B]/5',
    label: 'Completed',
  },
  current: {
    dot: 'bg-[#C4956A]',
    border: 'border-[#C4956A]/30',
    bg: 'bg-[#C4956A]/8',
    label: 'Current Phase',
  },
  planned: {
    dot: 'bg-[#5A7A8A]',
    border: 'border-[#5A7A8A]/30',
    bg: 'bg-[#5A7A8A]/5',
    label: 'Planned',
  },
};

export function RoadmapTimeline({ phases }: RoadmapTimelineProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Decentralization roadmap timeline"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
          Governance Phases
        </h2>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="font-sans text-[13px] text-accent-primary underline underline-offset-2 hover:opacity-80"
          aria-label={showTable ? 'Show timeline view' : 'Show data table view'}
        >
          {showTable ? 'Show timeline' : 'Show data table'}
        </button>
      </div>

      {showTable ? (
        <table
          className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
          aria-label="Governance phases data"
        >
          <thead>
            <tr className="border-b border-surface-subtle">
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Phase</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Timeline</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Status</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">
                Capabilities
              </th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => {
              const colors = STATUS_COLORS[phase.status] ?? STATUS_COLORS.planned;
              return (
                <tr key={phase.id} className="border-b border-surface-subtle/50">
                  <td className="py-[var(--spacing-sm)] text-text-primary">
                    Phase {phase.id}: {phase.name}
                  </td>
                  <td className="py-[var(--spacing-sm)] text-text-primary">
                    {phase.timelineRange}
                  </td>
                  <td className="py-[var(--spacing-sm)] text-text-primary">{colors.label}</td>
                  <td className="py-[var(--spacing-sm)] text-text-primary">
                    {phase.milestones.map((m) => m.capability).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div
          className="relative mt-[var(--spacing-xl)]"
          role="img"
          aria-label={`Governance timeline with ${phases.length} phases: ${phases.map((p) => `Phase ${p.id} ${p.name} (${STATUS_COLORS[p.status]?.label ?? p.status})`).join(', ')}`}
        >
          {/* Vertical timeline line */}
          <div
            className="absolute top-0 bottom-0 left-[15px] w-[2px] bg-surface-border"
            aria-hidden="true"
          />

          <Accordion.Root type="multiple" className="space-y-[var(--spacing-lg)]">
            {phases.map((phase) => {
              const colors = STATUS_COLORS[phase.status] ?? STATUS_COLORS.planned;
              return <MilestoneCard key={phase.id} phase={phase} colors={colors} />;
            })}
          </Accordion.Root>
        </div>
      )}
    </section>
  );
}
