import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EditorApplicationDto } from '@edin/shared';
import { ApplicationReviewCard } from './application-review-card';

const mockApplication: EditorApplicationDto = {
  id: 'app-1',
  contributorId: 'c-1',
  contributorName: 'Jane Doe',
  contributorAvatarUrl: null,
  domain: 'Technology',
  status: 'PENDING',
  applicationStatement: 'I have years of experience in tech reviews.',
  reviewedById: null,
  reviewedAt: null,
  reviewNotes: null,
  revokedAt: null,
  revokeReason: null,
  createdAt: '2026-03-09T00:00:00Z',
};

describe('ApplicationReviewCard', () => {
  it('renders applicant name and statement', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('I have years of experience in tech reviews.')).toBeInTheDocument();
  });

  it('renders domain badge', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('shows approve and reject buttons', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('shows review form when approve is clicked', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    fireEvent.click(screen.getByText('Approve'));
    expect(screen.getByText('Review notes (optional)')).toBeInTheDocument();
    expect(screen.getByText('Confirm Approval')).toBeInTheDocument();
  });

  it('shows review form when reject is clicked', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByText('Reason for rejection')).toBeInTheDocument();
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument();
  });

  it('calls onReview with approve decision', () => {
    const onReview = vi.fn();
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={onReview}
        isSubmitting={false}
      />,
    );
    fireEvent.click(screen.getByText('Approve'));
    fireEvent.change(screen.getByPlaceholderText(/Optional notes/), {
      target: { value: 'Great candidate' },
    });
    fireEvent.click(screen.getByText('Confirm Approval'));
    expect(onReview).toHaveBeenCalledWith('app-1', 'APPROVED', 'Great candidate');
  });

  it('calls onReview with reject decision', () => {
    const onReview = vi.fn();
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={onReview}
        isSubmitting={false}
      />,
    );
    fireEvent.click(screen.getByText('Reject'));
    fireEvent.click(screen.getByText('Confirm Rejection'));
    expect(onReview).toHaveBeenCalledWith('app-1', 'REJECTED', undefined);
  });

  it('closes review form on cancel', () => {
    render(
      <ApplicationReviewCard
        application={mockApplication}
        onReview={vi.fn()}
        isSubmitting={false}
      />,
    );
    fireEvent.click(screen.getByText('Approve'));
    expect(screen.getByText('Confirm Approval')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Confirm Approval')).not.toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });
});
