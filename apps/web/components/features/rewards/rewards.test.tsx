import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { REWARD_METHODOLOGY } from '@edin/shared';
import { RewardsHero, RewardsHeroSkeleton } from './rewards-hero';
import { ScalingLawExplainer } from './scaling-law-explainer';
import { FormulaBreakdown } from './formula-breakdown';
import { GlossarySection } from './glossary-section';
import { RewardsSkeleton } from './rewards-skeleton';

// Mock Recharts with basic rendering
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <svg data-testid="area-chart" data-count={data?.length}>
      {children}
    </svg>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <rect data-testid="area" data-key={dataKey} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe('RewardsHero', () => {
  it('renders heading with organic growth language', () => {
    render(<RewardsHero />);

    expect(screen.getByText('How Rewards Work')).toBeInTheDocument();
    expect(screen.getByText(/garden that grows richer/)).toBeInTheDocument();
  });

  it('uses h1 heading for SEO', () => {
    render(<RewardsHero />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('How Rewards Work');
  });
});

describe('ScalingLawExplainer', () => {
  it('renders narrative text with garden metaphors', () => {
    render(<ScalingLawExplainer overview={REWARD_METHODOLOGY.overview} />);

    expect(screen.getByText(/garden that grows richer/)).toBeInTheDocument();
    expect(screen.getByText(/scaling-law reward model/)).toBeInTheDocument();
  });

  it('renders multiple paragraphs from overview text', () => {
    render(<ScalingLawExplainer overview={REWARD_METHODOLOGY.overview} />);

    const paragraphs = screen.getAllByText(/.+/i, { selector: 'p' });
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });
});

describe('GrowthCurveChart', () => {
  it('renders Recharts AreaChart with correct data points', async () => {
    const { GrowthCurveChart } = await import('./growth-curve-chart');
    render(<GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />);

    const chart = screen.getByTestId('area-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-count', '5');
  });

  it('renders heading text', async () => {
    const { GrowthCurveChart } = await import('./growth-curve-chart');
    render(<GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />);

    expect(screen.getByText('Your Garden is Growing')).toBeInTheDocument();
  });

  it('shows accessible data table toggle', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const { GrowthCurveChart } = await import('./growth-curve-chart');
    render(<GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />);

    const toggleBtn = screen.getByText('Show data table');
    await userEvent.setup().click(toggleBtn);

    expect(screen.getByText('1 month')).toBeInTheDocument();
    expect(screen.getByText('1x')).toBeInTheDocument();
    expect(screen.getByText('2 years')).toBeInTheDocument();
    expect(screen.getByText('14x')).toBeInTheDocument();
  });
});

describe('FormulaBreakdown', () => {
  it('renders all 4 scoring components', () => {
    render(<FormulaBreakdown components={REWARD_METHODOLOGY.formulaComponents} />);

    expect(screen.getByText('AI Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Peer Feedback')).toBeInTheDocument();
    expect(screen.getByText('Task Complexity')).toBeInTheDocument();
    expect(screen.getByText('Domain Normalization')).toBeInTheDocument();
  });

  it('renders qualitative weight descriptions', () => {
    render(<FormulaBreakdown components={REWARD_METHODOLOGY.formulaComponents} />);

    expect(screen.getAllByText('Significant factor')).toHaveLength(2);
    expect(screen.getByText('Moderate factor')).toBeInTheDocument();
    expect(screen.getByText('Balancing adjustment')).toBeInTheDocument();
  });

  it('renders component descriptions', () => {
    render(<FormulaBreakdown components={REWARD_METHODOLOGY.formulaComponents} />);

    expect(screen.getByText(/AI evaluation engine/)).toBeInTheDocument();
    expect(screen.getByText(/structured rubrics/)).toBeInTheDocument();
  });
});

describe('GlossarySection', () => {
  it('renders expandable terms', () => {
    render(<GlossarySection terms={REWARD_METHODOLOGY.glossary} />);

    expect(screen.getByText('Domain Normalization')).toBeInTheDocument();
    expect(screen.getByText('Complexity Multiplier')).toBeInTheDocument();
    expect(screen.getByText('Temporal Aggregation')).toBeInTheDocument();
    expect(screen.getByText('Scaling-Law Compounding')).toBeInTheDocument();
  });

  it('uses details/summary for progressive disclosure', () => {
    const { container } = render(<GlossarySection terms={REWARD_METHODOLOGY.glossary} />);

    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(4);
  });
});

describe('RewardsHeroSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<RewardsHeroSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading rewards hero')).toBeInTheDocument();
  });
});

describe('RewardsSkeleton', () => {
  it('renders combined skeleton with status role', () => {
    render(<RewardsSkeleton />);

    expect(screen.getByLabelText('Loading rewards page')).toBeInTheDocument();
  });

  it('has correct placeholder counts', () => {
    render(<RewardsSkeleton />);

    const skeletons = screen.getByLabelText('Loading rewards page');
    const allSkeletons = skeletons.querySelectorAll('.skeleton');
    expect(allSkeletons.length).toBeGreaterThan(10);
  });
});
