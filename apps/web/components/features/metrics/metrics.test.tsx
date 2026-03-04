import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlatformMetrics } from '@edin/shared';
import { MetricsHero, MetricsHeroSkeleton } from './metrics-hero';
import { StatCard, StatCardSkeleton } from './stat-card';
import { MetricsStatsGrid, MetricsStatsGridSkeleton } from './metrics-stats-grid';
import { MetricsEmptyState } from './metrics-empty-state';
import { MetricsSkeleton } from './metrics-skeleton';

// Mock Recharts with basic SVG rendering
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="pie-chart">{children}</svg>
  ),
  Pie: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <g data-testid="pie" data-count={data?.length}>
      {children}
    </g>
  ),
  Cell: ({ fill }: { fill: string }) => <rect data-testid="cell" data-fill={fill} />,
  Tooltip: () => null,
}));

const mockMetrics: PlatformMetrics = {
  activeContributors: 30,
  contributionVelocity: 0,
  domainDistribution: [
    { domain: 'Technology', count: 10, percentage: 40 },
    { domain: 'Fintech', count: 8, percentage: 32 },
    { domain: 'Impact', count: 4, percentage: 16 },
    { domain: 'Governance', count: 3, percentage: 12 },
  ],
  retentionRate: 78,
};

describe('MetricsHero', () => {
  it('renders heading and subtitle', () => {
    render(<MetricsHero />);

    expect(screen.getByText('Platform Metrics')).toBeInTheDocument();
    expect(screen.getByText(/living snapshot of community health/)).toBeInTheDocument();
  });

  it('uses h1 heading for SEO', () => {
    render(<MetricsHero />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Platform Metrics');
  });
});

describe('StatCard', () => {
  it('renders label, value, and context text', () => {
    render(
      <StatCard label="Active Contributors" value={25} context="Currently active in community" />,
    );

    expect(screen.getByText('Active Contributors')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Currently active in community')).toBeInTheDocument();
  });

  it('renders string values correctly', () => {
    render(<StatCard label="Velocity" value="Coming Soon" context="Not yet available" />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });
});

describe('MetricsStatsGrid', () => {
  it('renders 4 stat cards with correct data', () => {
    render(<MetricsStatsGrid metrics={mockMetrics} />);

    expect(screen.getByText('Active Contributors')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Contribution Velocity')).toBeInTheDocument();
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.getByText('Retention Rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('Total Contributors')).toBeInTheDocument();
  });

  it('shows Coming Soon for zero contribution velocity', () => {
    render(<MetricsStatsGrid metrics={{ ...mockMetrics, contributionVelocity: 0 }} />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.getByText(/Tracking begins/)).toBeInTheDocument();
  });
});

describe('DomainDistributionChart', () => {
  it('renders with correct domain colors', async () => {
    const { DomainDistributionChart } = await import('./domain-distribution-chart');
    render(<DomainDistributionChart data={mockMetrics.domainDistribution} />);

    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(4);
    expect(cells[0]).toHaveAttribute('data-fill', '#3A7D7E'); // Technology
    expect(cells[1]).toHaveAttribute('data-fill', '#C49A3C'); // Fintech
    expect(cells[2]).toHaveAttribute('data-fill', '#B06B6B'); // Impact
    expect(cells[3]).toHaveAttribute('data-fill', '#7B6B8A'); // Governance
  });

  it('shows accessible data table alternative', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const { DomainDistributionChart } = await import('./domain-distribution-chart');
    render(<DomainDistributionChart data={mockMetrics.domainDistribution} />);

    const toggleBtn = screen.getByText('Show data table');
    await userEvent.setup().click(toggleBtn);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('32%')).toBeInTheDocument();
  });

  it('does not render when data is empty', async () => {
    const { DomainDistributionChart } = await import('./domain-distribution-chart');
    const { container } = render(<DomainDistributionChart data={[]} />);

    expect(container.innerHTML).toBe('');
  });
});

describe('MetricsEmptyState', () => {
  it('renders dignified message when no data', () => {
    render(<MetricsEmptyState />);

    expect(screen.getByText('Metrics are on the way')).toBeInTheDocument();
    expect(screen.getByText(/As our community grows/)).toBeInTheDocument();
  });
});

describe('MetricsHeroSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<MetricsHeroSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading metrics hero')).toBeInTheDocument();
  });
});

describe('StatCardSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<StatCardSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading metric')).toBeInTheDocument();
  });
});

describe('MetricsStatsGridSkeleton', () => {
  it('renders 4 skeleton cards', () => {
    render(<MetricsStatsGridSkeleton />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(4);
  });
});

describe('MetricsSkeleton', () => {
  it('renders combined skeleton with status role', () => {
    render(<MetricsSkeleton />);

    expect(screen.getByLabelText('Loading metrics page')).toBeInTheDocument();
  });
});
