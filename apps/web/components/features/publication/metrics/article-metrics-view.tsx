'use client';

import type { ArticleDto, ArticleMetricsDto, ArticleRewardAllocationDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';
import { GrowthCurveChart } from './growth-curve-chart';
import { RewardSplitBadge } from './reward-split-badge';

interface ArticleMetricsViewProps {
  article: ArticleDto;
  metrics: ArticleMetricsDto | null;
  allocation: ArticleRewardAllocationDto | null;
}

export function ArticleMetricsView({ article, metrics, allocation }: ArticleMetricsViewProps) {
  const domainColor = DOMAIN_COLORS[article.domain] ?? '#6B7B8D';

  return (
    <div className="space-y-[var(--spacing-2xl)]">
      {/* Header */}
      <div>
        <span
          className="inline-block rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium uppercase text-surface-raised"
          style={{ backgroundColor: domainColor }}
        >
          {article.domain}
        </span>
        <h1 className="mt-[var(--spacing-sm)] font-serif text-[1.75rem] font-bold text-text-primary">
          {article.title}
        </h1>
        {article.publishedAt && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-text-secondary">
            Published{' '}
            {new Date(article.publishedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Reward Split */}
      {allocation && <RewardSplitBadge allocation={allocation} />}

      {/* Embargo State */}
      {metrics?.isEmbargoed && (
        <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="font-serif text-[1.125rem] text-text-primary">
            Your article is growing roots.
          </p>
          <p className="mt-[var(--spacing-sm)] font-sans text-[15px] text-text-secondary">
            Metrics will bloom 48 hours after publication.
          </p>
          {metrics.embargoEndsAt && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary">
              Available{' '}
              {new Date(metrics.embargoEndsAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Metrics Content */}
      {metrics && !metrics.isEmbargoed && (
        <>
          {/* Reach */}
          <section>
            <h2 className="mb-[var(--spacing-md)] font-serif text-[1.25rem] font-semibold text-text-primary">
              Reach
            </h2>
            <div className="grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2">
              <MetricCard value={metrics.uniqueViews} suffix="unique readers" />
              <MetricCard value={metrics.totalViews} suffix="views" />
            </div>
          </section>

          {/* Engagement */}
          {(metrics.avgTimeOnPageSeconds !== null || metrics.avgScrollDepthPercent !== null) && (
            <section>
              <h2 className="mb-[var(--spacing-md)] font-serif text-[1.25rem] font-semibold text-text-primary">
                Engagement
              </h2>
              <div className="grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2">
                {metrics.avgTimeOnPageSeconds !== null && (
                  <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
                    <p className="font-sans text-[15px] text-text-primary">
                      Readers spent an average of{' '}
                      <span className="font-semibold">
                        {formatTime(metrics.avgTimeOnPageSeconds)}
                      </span>{' '}
                      with your words
                    </p>
                  </div>
                )}
                {metrics.avgScrollDepthPercent !== null && (
                  <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
                    <p className="font-sans text-[15px] text-text-primary">
                      Readers typically explored{' '}
                      <span className="font-semibold">
                        {Math.round(metrics.avgScrollDepthPercent)}%
                      </span>{' '}
                      of your article
                    </p>
                    <div className="mt-[var(--spacing-sm)] h-2 rounded-full bg-surface-sunken">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.round(metrics.avgScrollDepthPercent)}%`,
                          backgroundColor: 'var(--color-accent-primary)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Growth Over Time */}
          {metrics.viewsOverTime.length > 0 && (
            <section>
              <h2 className="mb-[var(--spacing-md)] font-serif text-[1.25rem] font-semibold text-text-primary">
                Growth Over Time
              </h2>
              <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
                <GrowthCurveChart data={metrics.viewsOverTime} />
              </div>
            </section>
          )}

          {/* Referral Sources */}
          {metrics.referralSources.length > 0 && (
            <section>
              <h2 className="mb-[var(--spacing-md)] font-serif text-[1.25rem] font-semibold text-text-primary">
                Where readers found you
              </h2>
              <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
                <ul className="space-y-[var(--spacing-sm)]">
                  {metrics.referralSources.map((source) => (
                    <li
                      key={source.source}
                      className="flex items-center justify-between font-sans text-[14px]"
                    >
                      <span className="text-text-primary">
                        {formatReferralSource(source.source)}
                      </span>
                      <span className="text-text-secondary">{source.count} readers</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ value, suffix }: { value: number; suffix: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
      <p className="font-sans text-[32px] font-bold text-text-primary">{value}</p>
      <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-text-secondary">{suffix}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  if (remaining === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${minutes}m ${remaining}s`;
}

function formatReferralSource(source: string): string {
  try {
    const url = new URL(source);
    return url.hostname.replace('www.', '');
  } catch {
    return source || 'Direct';
  }
}
