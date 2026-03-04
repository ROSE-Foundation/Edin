'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ScalingDataPoint } from '@edin/shared';

interface GrowthCurveChartProps {
  data: ScalingDataPoint[];
}

export function GrowthCurveChart({ data }: GrowthCurveChartProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Growth curve visualization"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-brand-primary">
          Your Garden is Growing
        </h2>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="font-sans text-[13px] text-brand-accent underline underline-offset-2 hover:opacity-80"
          aria-label={showTable ? 'Show chart view' : 'Show data table view'}
        >
          {showTable ? 'Show chart' : 'Show data table'}
        </button>
      </div>

      <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
        See how sustained engagement compounds your reward multiplier over time.
      </p>

      {showTable ? (
        <table
          className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
          aria-label="Growth curve data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Time Horizon
              </th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Reward Multiplier
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.month} className="border-b border-surface-border/50">
                <td className="py-[var(--spacing-sm)] text-brand-primary">{point.label}</td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">{point.multiplier}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Growth curve: ${data.map((d) => `${d.label}: ${d.multiplier}x`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4956A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#C4956A" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  fill: 'var(--color-brand-secondary)',
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
              />
              <YAxis
                tick={{
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  fill: 'var(--color-brand-secondary)',
                }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
                tickFormatter={(value: number) => `${value}x`}
              />
              <Tooltip
                formatter={(value) => [`${value}x`, 'Multiplier']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                }}
              />
              <Area
                type="monotone"
                dataKey="multiplier"
                stroke="#C4956A"
                strokeWidth={2}
                fill="url(#growthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
