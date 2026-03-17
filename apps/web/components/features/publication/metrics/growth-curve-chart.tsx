'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyViewsDto } from '@edin/shared';

interface GrowthCurveChartProps {
  data: DailyViewsDto[];
}

export function GrowthCurveChart({ data }: GrowthCurveChartProps) {
  const [showTable, setShowTable] = useState(false);

  const chartData = data.map((d) => ({
    date: d.date,
    views: d.views,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  if (showTable) {
    return (
      <div>
        <button
          onClick={() => setShowTable(false)}
          className="mb-[var(--spacing-sm)] font-sans text-[13px] text-accent-primary hover:underline"
        >
          Show chart
        </button>
        <table className="w-full font-sans text-[14px]" role="table">
          <thead>
            <tr className="border-b border-surface-subtle">
              <th className="pb-[var(--spacing-xs)] text-left text-text-secondary">Date</th>
              <th className="pb-[var(--spacing-xs)] text-right text-text-secondary">Views</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.date} className="border-b border-surface-subtle/50">
                <td className="py-[var(--spacing-xs)] text-text-primary">{d.label}</td>
                <td className="py-[var(--spacing-xs)] text-right text-text-primary">{d.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const totalViews = data.reduce((sum, d) => sum + d.views, 0);
  const trendDescription = `Views over ${data.length} days, totaling ${totalViews} views`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-sans text-[13px] text-text-secondary">Last 30 days</p>
        <button
          onClick={() => setShowTable(true)}
          className="font-sans text-[13px] text-accent-primary hover:underline"
          aria-label="Show data as table"
        >
          View as table
        </button>
      </div>
      <div className="mt-[var(--spacing-sm)]" role="img" aria-label={trendDescription}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-accent-primary, #C4956A)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accent-primary, #C4956A)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary, #6B7B8D)' }}
              interval="preserveStartEnd"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-raised, #fff)',
                border: '1px solid var(--color-surface-border, #e5e7eb)',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'var(--font-inter, sans-serif)',
              }}
              labelStyle={{ color: 'var(--color-text-primary, #2C3A4A)' }}
              formatter={(value) => [`${value} views`, 'Views']}
            />
            <Area
              type="natural"
              dataKey="views"
              stroke="var(--color-accent-primary, #C4956A)"
              strokeWidth={2}
              fill="url(#growthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
