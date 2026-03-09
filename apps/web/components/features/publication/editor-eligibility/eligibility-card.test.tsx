import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EligibilityCheckDto } from '@edin/shared';
import { EligibilityCard } from './eligibility-card';

const baseCriteria = {
  id: 'crit-1',
  domain: 'Technology',
  minContributionCount: 10,
  minGovernanceWeight: 0,
  maxConcurrentAssignments: 5,
  updatedAt: '2026-03-09T00:00:00Z',
};

function makeCheck(overrides: Partial<EligibilityCheckDto> = {}): EligibilityCheckDto {
  return {
    domain: 'Technology',
    eligible: true,
    criteria: baseCriteria,
    current: { contributionCount: 15, governanceWeight: 0 },
    existingApplication: null,
    ...overrides,
  };
}

describe('EligibilityCard', () => {
  it('renders domain name', () => {
    render(<EligibilityCard check={makeCheck()} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('shows met criteria with checkmark', () => {
    render(<EligibilityCard check={makeCheck()} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText(/Evaluated contributions: 15 \/ 10 required/)).toBeInTheDocument();
  });

  it('shows unmet criteria', () => {
    const check = makeCheck({
      eligible: false,
      current: { contributionCount: 3, governanceWeight: 0 },
    });
    render(<EligibilityCard check={check} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText(/Evaluated contributions: 3 \/ 10 required/)).toBeInTheDocument();
  });

  it('shows apply button when eligible', () => {
    render(<EligibilityCard check={makeCheck()} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText('Apply as Editor')).toBeInTheDocument();
  });

  it('does not show apply button when ineligible', () => {
    const check = makeCheck({ eligible: false });
    render(<EligibilityCard check={check} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.queryByText('Apply as Editor')).not.toBeInTheDocument();
    expect(screen.getByText(/Meet all criteria/)).toBeInTheDocument();
  });

  it('shows application form when apply is clicked', () => {
    render(<EligibilityCard check={makeCheck()} onApply={vi.fn()} isSubmitting={false} />);
    fireEvent.click(screen.getByText('Apply as Editor'));
    expect(screen.getByPlaceholderText(/Describe your expertise/)).toBeInTheDocument();
    expect(screen.getByText('Submit Application')).toBeInTheDocument();
  });

  it('validates minimum statement length', () => {
    const onApply = vi.fn();
    render(<EligibilityCard check={makeCheck()} onApply={onApply} isSubmitting={false} />);
    fireEvent.click(screen.getByText('Apply as Editor'));
    fireEvent.click(screen.getByText('Submit Application'));
    expect(screen.getByText(/at least 20 characters/)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('calls onApply with valid statement', () => {
    const onApply = vi.fn();
    render(<EligibilityCard check={makeCheck()} onApply={onApply} isSubmitting={false} />);
    fireEvent.click(screen.getByText('Apply as Editor'));
    fireEvent.change(screen.getByPlaceholderText(/Describe your expertise/), {
      target: { value: 'I have extensive experience in technology and want to contribute.' },
    });
    fireEvent.click(screen.getByText('Submit Application'));
    expect(onApply).toHaveBeenCalledWith(
      'Technology',
      'I have extensive experience in technology and want to contribute.',
    );
  });

  it('shows pending application status', () => {
    const check = makeCheck({
      existingApplication: {
        id: 'app-1',
        contributorId: 'c-1',
        contributorName: 'Test',
        contributorAvatarUrl: null,
        domain: 'Technology',
        status: 'PENDING',
        applicationStatement: 'test',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: '2026-03-09T00:00:00Z',
      },
    });
    render(<EligibilityCard check={check} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText('Application Pending')).toBeInTheDocument();
  });

  it('shows reapply button for rejected applications when eligible', () => {
    const check = makeCheck({
      eligible: true,
      existingApplication: {
        id: 'app-1',
        contributorId: 'c-1',
        contributorName: 'Test',
        contributorAvatarUrl: null,
        domain: 'Technology',
        status: 'REJECTED',
        applicationStatement: 'test',
        reviewedById: 'admin-1',
        reviewedAt: '2026-03-09T00:00:00Z',
        reviewNotes: 'Not enough experience',
        revokedAt: null,
        revokeReason: null,
        createdAt: '2026-03-08T00:00:00Z',
      },
    });
    render(<EligibilityCard check={check} onApply={vi.fn()} isSubmitting={false} />);
    expect(screen.getByText('Application Declined')).toBeInTheDocument();
    expect(screen.getByText('Not enough experience')).toBeInTheDocument();
    expect(screen.getByText('Reapply as Editor')).toBeInTheDocument();
  });
});
