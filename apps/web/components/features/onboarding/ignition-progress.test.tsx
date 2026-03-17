import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IgnitionProgress } from './ignition-progress';

const completedMilestones = [
  {
    id: 'ms-1',
    contributorId: 'c-1',
    milestoneType: 'ACCOUNT_ACTIVATED' as const,
    completedAt: new Date().toISOString(),
    metadata: null,
  },
  {
    id: 'ms-2',
    contributorId: 'c-1',
    milestoneType: 'BUDDY_ASSIGNED' as const,
    completedAt: new Date().toISOString(),
    metadata: null,
  },
];

describe('IgnitionProgress', () => {
  it('renders all 5 milestone labels on desktop', () => {
    render(
      <IgnitionProgress milestones={completedMilestones} isExpired={false} isLoading={false} />,
    );

    // Completed milestones show their label
    expect(screen.getByText('Account activated')).toBeTruthy();
    expect(screen.getByText('Buddy paired')).toBeTruthy();

    // Pending milestones show pendingLabel
    expect(screen.getByText('A meaningful first task awaits you')).toBeTruthy();
    expect(screen.getByText('You will be able to claim your first task')).toBeTruthy();
    expect(screen.getByText('Your first contribution will mark the beginning')).toBeTruthy();
  });

  it('renders section heading', () => {
    render(
      <IgnitionProgress milestones={completedMilestones} isExpired={false} isLoading={false} />,
    );

    expect(screen.getByText('Your Journey')).toBeTruthy();
  });

  it('shows expired message when isExpired is true', () => {
    render(
      <IgnitionProgress milestones={completedMilestones} isExpired={true} isLoading={false} />,
    );

    expect(screen.getByText(/Complete at your own pace/)).toBeTruthy();
  });

  it('does not show expired message when not expired', () => {
    render(
      <IgnitionProgress milestones={completedMilestones} isExpired={false} isLoading={false} />,
    );

    expect(screen.queryByText(/Complete at your own pace/)).toBeNull();
  });

  it('renders completed state with checkmarks', () => {
    const { container } = render(
      <IgnitionProgress milestones={completedMilestones} isExpired={false} isLoading={false} />,
    );

    // Two completed dots (bg-accent-primary)
    const accentDots = container.querySelectorAll('.bg-accent-primary');
    expect(accentDots.length).toBeGreaterThanOrEqual(2);
  });

  it('renders skeleton loading state', () => {
    const { container } = render(
      <IgnitionProgress milestones={[]} isExpired={false} isLoading={true} />,
    );

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders with no milestones completed', () => {
    render(<IgnitionProgress milestones={[]} isExpired={false} isLoading={false} />);

    // All milestones show pending labels
    expect(screen.getByText('Your account will be set up shortly')).toBeTruthy();
    expect(screen.getByText('Your buddy will be paired with you soon')).toBeTruthy();
  });

  it('renders mobile dots', () => {
    const { container } = render(
      <IgnitionProgress milestones={completedMilestones} isExpired={false} isLoading={false} />,
    );

    // Mobile container has 5 small dot elements (10px)
    const mobileDots = container.querySelectorAll('.sm\\:hidden .rounded-full');
    expect(mobileDots.length).toBe(5);
  });
});
