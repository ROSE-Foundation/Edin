import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleLifecycle, StatusBadge } from './article-lifecycle';

describe('ArticleLifecycle', () => {
  it('renders all lifecycle steps', () => {
    render(<ArticleLifecycle currentStatus="DRAFT" domain="Technology" />);

    expect(screen.getByText('Draft')).toBeDefined();
    expect(screen.getByText('Submitted')).toBeDefined();
    expect(screen.getByText('In Review')).toBeDefined();
    expect(screen.getByText('Approved')).toBeDefined();
    expect(screen.getByText('Published')).toBeDefined();
  });

  it('highlights current status with domain color', () => {
    render(<ArticleLifecycle currentStatus="EDITORIAL_REVIEW" domain="Technology" />);

    const reviewLabel = screen.getByText('In Review');
    expect(reviewLabel.style.fontWeight).toBe('600');
    // jsdom converts hex to rgb
    expect(reviewLabel.style.color).toBe('rgb(58, 125, 126)');
  });

  it('shows revision requested indicator', () => {
    render(<ArticleLifecycle currentStatus="REVISION_REQUESTED" domain="Fintech" />);

    expect(screen.getByText('Revision Requested')).toBeDefined();
  });

  it('shows archived status', () => {
    render(<ArticleLifecycle currentStatus="ARCHIVED" />);

    expect(screen.getByText('Archived')).toBeDefined();
  });

  it('marks completed steps in success color', () => {
    render(<ArticleLifecycle currentStatus="APPROVED" domain="Impact" />);

    const draftLabel = screen.getByText('Draft');
    // jsdom converts hex to rgb
    expect(draftLabel.style.color).toBe('rgb(90, 138, 107)');
  });
});

describe('StatusBadge', () => {
  it('renders correct label for DRAFT', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('Draft')).toBeDefined();
  });

  it('renders correct label for REVISION_REQUESTED', () => {
    render(<StatusBadge status="REVISION_REQUESTED" />);
    expect(screen.getByText('Revisions Requested')).toBeDefined();
  });

  it('renders correct label for PUBLISHED', () => {
    render(<StatusBadge status="PUBLISHED" />);
    expect(screen.getByText('Published')).toBeDefined();
  });

  it('renders correct label for APPROVED', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeDefined();
  });

  it('renders correct label for EDITORIAL_REVIEW', () => {
    render(<StatusBadge status="EDITORIAL_REVIEW" />);
    expect(screen.getByText('In Review')).toBeDefined();
  });
});
