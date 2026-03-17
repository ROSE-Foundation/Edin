'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSprintVelocity, useSprintList } from '../../../../hooks/use-sprint-metrics';
import { VelocityChart } from '../../../../components/features/sprint-dashboard/velocity-chart';
import { DomainFilter } from '../../../../components/features/sprint-dashboard/domain-filter';
import { ExportButton } from '../../../../components/features/sprint-dashboard/export-button';

export default function SprintsPage() {
  const [domain, setDomain] = useState<string | undefined>();
  const { velocityData, isLoading: velocityLoading } = useSprintVelocity({ domain });
  const { sprints, isLoading: sprintsLoading } = useSprintList({ domain });

  return (
    <div className="p-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] flex items-center justify-between">
        <h1 className="font-serif text-[24px] font-bold text-text-primary">Sprint Dashboard</h1>
        <div className="flex items-center gap-[var(--spacing-lg)]">
          <DomainFilter value={domain} onChange={setDomain} />
          <Link
            href="/admin/sprints/contributors"
            className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-accent-primary hover:bg-accent-primary/10"
          >
            Contributors
          </Link>
          <Link
            href="/admin/sprints/monitoring"
            className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-accent-primary hover:bg-accent-primary/10"
          >
            Monitoring
          </Link>
          <ExportButton domain={domain} />
        </div>
      </div>

      <div className="space-y-[var(--spacing-lg)]">
        <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans text-[16px] font-semibold text-text-primary">
                Zenhub Integration
              </h2>
              <p className="mt-[var(--spacing-xs)] text-[13px] text-text-secondary">
                Configure API credentials, webhook settings, and workspace mapping
              </p>
            </div>
            <Link
              href="/admin/sprints/configuration"
              className="rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-accent-primary hover:bg-accent-primary/10"
            >
              Configure
            </Link>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
          {velocityLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-[14px] text-text-tertiary">Loading velocity data...</p>
            </div>
          ) : (
            <VelocityChart data={velocityData} />
          )}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
          <h2 className="font-serif text-[18px] font-semibold text-text-primary">Sprint History</h2>

          {sprintsLoading ? (
            <p className="mt-[var(--spacing-md)] text-[14px] text-text-tertiary">
              Loading sprints...
            </p>
          ) : sprints.length === 0 ? (
            <p className="mt-[var(--spacing-md)] text-[14px] text-text-tertiary">
              No sprints tracked yet. Data will appear once the Zenhub integration is configured and
              sprint data begins flowing.
            </p>
          ) : (
            <table
              className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
              aria-label="Sprint history"
            >
              <thead>
                <tr className="border-b border-surface-subtle">
                  <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Sprint</th>
                  <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Period</th>
                  <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
                    Committed
                  </th>
                  <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
                    Delivered
                  </th>
                  <th className="pb-[var(--spacing-sm)] text-right font-medium text-text-secondary">
                    Velocity
                  </th>
                  <th className="pb-[var(--spacing-sm)]" />
                </tr>
              </thead>
              <tbody>
                {sprints.map((sprint) => (
                  <tr key={sprint.id} className="border-b border-surface-subtle/50">
                    <td className="py-[var(--spacing-sm)] text-text-primary">
                      {sprint.sprintName}
                    </td>
                    <td className="py-[var(--spacing-sm)] text-text-primary">
                      {sprint.sprintStart.split('T')[0]} — {sprint.sprintEnd.split('T')[0]}
                    </td>
                    <td className="py-[var(--spacing-sm)] text-right text-text-primary">
                      {sprint.committedPoints}
                    </td>
                    <td className="py-[var(--spacing-sm)] text-right text-text-primary">
                      {sprint.deliveredPoints}
                    </td>
                    <td className="py-[var(--spacing-sm)] text-right font-medium text-text-primary">
                      {sprint.velocity}
                    </td>
                    <td className="py-[var(--spacing-sm)] text-right">
                      <Link
                        href={`/admin/sprints/${sprint.id}`}
                        className="text-[13px] text-accent-primary underline underline-offset-2 hover:opacity-80"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
