import type { Metadata } from 'next';
import type { PlatformMetrics } from '@edin/shared';
import { MetricsHero } from '../../../components/features/metrics/metrics-hero';
import { MetricsContent } from '../../../components/features/metrics/metrics-content';
import { MetricsEmptyState } from '../../../components/features/metrics/metrics-empty-state';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/showcase/metrics`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    return body.data ?? null;
  } catch (error) {
    console.error('Failed to fetch platform metrics', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Platform Metrics — Edin Community',
    description:
      'Explore real-time community health metrics: active contributors, domain distribution, retention rates, and contribution velocity across all four domains.',
    openGraph: {
      title: 'Platform Metrics — Edin Community',
      description:
        'Explore real-time community health metrics: active contributors, domain distribution, and retention rates.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Platform Metrics — Edin Community',
      description:
        'Explore real-time community health metrics: active contributors, domain distribution, and retention rates.',
    },
  };
}

export default async function MetricsPage() {
  const metrics = await fetchPlatformMetrics();

  return (
    <main className="min-h-screen bg-surface-base">
      <MetricsHero />
      {metrics && metrics.activeContributors > 0 ? (
        <MetricsContent initialMetrics={metrics} />
      ) : (
        <MetricsEmptyState />
      )}
    </main>
  );
}
