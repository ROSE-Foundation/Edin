'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { DomainDistribution } from '@edin/shared';
import { DOMAIN_HEX_COLORS } from '../../../lib/domain-colors';

interface DomainDistributionChartProps {
  data: DomainDistribution[];
}

export function DomainDistributionChart({ data }: DomainDistributionChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return null;
  }

  return (
    <section className="mt-[var(--spacing-xl)]" aria-label="Domain distribution">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-text-primary">
          Domain Distribution
        </h2>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="font-sans text-[13px] text-accent-primary underline underline-offset-2 hover:opacity-80"
          aria-label={showTable ? 'Show chart view' : 'Show data table view'}
        >
          {showTable ? 'Show chart' : 'Show data table'}
        </button>
      </div>

      {showTable ? (
        <table
          className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
          aria-label="Domain distribution data"
        >
          <thead>
            <tr className="border-b border-surface-subtle">
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Domain</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">
                Contributors
              </th>
              <th className="pb-[var(--spacing-sm)] font-medium text-text-secondary">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.domain} className="border-b border-surface-subtle/50">
                <td className="py-[var(--spacing-sm)] text-text-primary">{item.domain}</td>
                <td className="py-[var(--spacing-sm)] text-text-primary">{item.count}</td>
                <td className="py-[var(--spacing-sm)] text-text-primary">{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Domain distribution: ${data.map((d) => `${d.domain} ${d.percentage}%`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="domain"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                stroke="none"
                label={(props: PieLabelRenderProps) =>
                  `${props.name ?? ''} ${Math.round((props.percent ?? 0) * 100)}%`
                }
              >
                {data.map((entry) => (
                  <Cell key={entry.domain} fill={DOMAIN_HEX_COLORS[entry.domain] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} contributors`, name]}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
