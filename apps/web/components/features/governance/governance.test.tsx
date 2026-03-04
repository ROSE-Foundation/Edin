import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PROGRESSIVE_DECENTRALIZATION_ROADMAP } from '@edin/shared';
import { GovernanceHero, GovernanceHeroSkeleton } from './governance-hero';
import { GovernanceExplainer } from './governance-explainer';
import { RoadmapTimeline } from './roadmap-timeline';
import { GovernanceGlossary } from './governance-glossary';
import { GovernanceSkeleton } from './governance-skeleton';
import { generateMetadata } from '../../../app/(public)/governance/page';

describe('GovernanceHero', () => {
  it('renders heading with governance title', () => {
    render(<GovernanceHero />);

    expect(screen.getByText('Progressive Decentralization')).toBeInTheDocument();
  });

  it('uses h1 heading for SEO', () => {
    render(<GovernanceHero />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Progressive Decentralization');
  });

  it('renders description text', () => {
    render(<GovernanceHero />);

    expect(screen.getByText(/governance authority transfers/)).toBeInTheDocument();
  });

  it('has aria-label on section', () => {
    render(<GovernanceHero />);

    expect(screen.getByLabelText('Governance roadmap introduction')).toBeInTheDocument();
  });
});

describe('GovernanceExplainer', () => {
  it('renders narrative text paragraphs', () => {
    render(<GovernanceExplainer overview={PROGRESSIVE_DECENTRALIZATION_ROADMAP.overview} />);

    expect(screen.getByText(/structural commitment/)).toBeInTheDocument();
    expect(screen.getByText(/Progressive decentralization acknowledges/)).toBeInTheDocument();
  });

  it('renders multiple paragraphs from overview text', () => {
    render(<GovernanceExplainer overview={PROGRESSIVE_DECENTRALIZATION_ROADMAP.overview} />);

    const paragraphs = screen.getAllByText(/.+/i, { selector: 'p' });
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it('has aria-label on section', () => {
    render(<GovernanceExplainer overview={PROGRESSIVE_DECENTRALIZATION_ROADMAP.overview} />);

    expect(screen.getByLabelText('How decentralization works')).toBeInTheDocument();
  });
});

describe('RoadmapTimeline', () => {
  it('renders all 4 phases', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(screen.getByText(/Phase 0: Foundation/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 1: Community Input/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2: Distributed Governance/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 3: Full Decentralization/)).toBeInTheDocument();
  });

  it('shows current phase highlighted with Current Phase label', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(screen.getByText('Current Phase')).toBeInTheDocument();
  });

  it('shows completed phase with Completed label', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows planned phases with Planned label', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    const plannedLabels = screen.getAllByText('Planned');
    expect(plannedLabels).toHaveLength(2);
  });

  it('renders timeline range for each phase', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
    expect(screen.getByText('Q2–Q3 2026')).toBeInTheDocument();
    expect(screen.getByText('Q4 2026 – Q1 2027')).toBeInTheDocument();
    expect(screen.getByText('2027+')).toBeInTheDocument();
  });

  it('has accessible timeline description', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(
      screen.getByRole('img', { name: /Governance timeline with 4 phases/ }),
    ).toBeInTheDocument();
  });

  it('renders data table toggle button', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    expect(screen.getByText('Show data table')).toBeInTheDocument();
  });

  it('shows data table when toggle is clicked', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    const toggleBtn = screen.getByText('Show data table');
    await userEvent.setup().click(toggleBtn);

    expect(screen.getByLabelText('Governance phases data')).toBeInTheDocument();
    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
    expect(screen.getByText('Show timeline')).toBeInTheDocument();
  });

  it('progressive disclosure works — expands phase details on click', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    const trigger = screen.getByText(/Phase 0: Foundation/).closest('button');
    expect(trigger).toBeTruthy();
    await userEvent.setup().click(trigger!);

    expect(screen.getByText('Governance model')).toBeInTheDocument();
    expect(screen.getByText('Key metrics')).toBeInTheDocument();
    expect(screen.getByText('Governance capabilities')).toBeInTheDocument();
    expect(screen.getByText('Admission decisions')).toBeInTheDocument();
    expect(screen.getByText(/Governance authority held by founding team:/)).toBeInTheDocument();
  });

  it('phase triggers provide 48px touch targets in stacked timeline cards', () => {
    render(<RoadmapTimeline phases={PROGRESSIVE_DECENTRALIZATION_ROADMAP.phases} />);

    const foundationTrigger = screen.getByText(/Phase 0: Foundation/).closest('button');
    expect(foundationTrigger).toBeTruthy();
    expect(foundationTrigger).toHaveClass('w-full');
    expect(foundationTrigger).toHaveClass('min-h-[48px]');
  });
});

describe('GovernancePage metadata', () => {
  it('returns SEO metadata with OpenGraph and Twitter fields', async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toBe('Progressive Decentralization Roadmap — Edin');
    expect(metadata.description).toContain('progressively transfers governance authority');
    expect(metadata.openGraph?.title).toBe('Progressive Decentralization Roadmap — Edin');
    expect(metadata.openGraph?.type).toBe('website');
    expect(metadata.twitter?.card).toBe('summary_large_image');
    expect(metadata.twitter?.title).toBe('Progressive Decentralization Roadmap — Edin');
  });
});

describe('GovernanceGlossary', () => {
  it('renders all glossary terms', () => {
    render(<GovernanceGlossary terms={PROGRESSIVE_DECENTRALIZATION_ROADMAP.glossary} />);

    expect(screen.getByText('Progressive Decentralization')).toBeInTheDocument();
    expect(screen.getByText('Governance Weight')).toBeInTheDocument();
    expect(screen.getByText('DAO')).toBeInTheDocument();
    expect(screen.getByText('Governance Proposal')).toBeInTheDocument();
    expect(screen.getByText('Founding Contributor')).toBeInTheDocument();
    expect(screen.getByText('Domain Breadth Multiplier')).toBeInTheDocument();
  });

  it('uses details/summary for progressive disclosure', () => {
    const { container } = render(
      <GovernanceGlossary terms={PROGRESSIVE_DECENTRALIZATION_ROADMAP.glossary} />,
    );

    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(6);
  });

  it('has aria-label on section', () => {
    render(<GovernanceGlossary terms={PROGRESSIVE_DECENTRALIZATION_ROADMAP.glossary} />);

    expect(screen.getByLabelText('Governance glossary')).toBeInTheDocument();
  });
});

describe('GovernanceHeroSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<GovernanceHeroSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading governance hero')).toBeInTheDocument();
  });
});

describe('GovernanceSkeleton', () => {
  it('renders combined skeleton with status role', () => {
    render(<GovernanceSkeleton />);

    expect(screen.getByLabelText('Loading governance page')).toBeInTheDocument();
  });

  it('has correct placeholder counts', () => {
    render(<GovernanceSkeleton />);

    const skeletons = screen.getByLabelText('Loading governance page');
    const allSkeletons = skeletons.querySelectorAll('.skeleton');
    expect(allSkeletons.length).toBeGreaterThan(10);
  });
});
