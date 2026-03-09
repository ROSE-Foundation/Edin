import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ArticleListItemDto } from '@edin/shared';
import { EditorDashboardSection } from './editor-dashboard-section';

const mockArticle = (id: string, title: string, status: string): ArticleListItemDto => ({
  id,
  title,
  slug: `article-${id}`,
  abstract: 'Test abstract',
  domain: 'Technology',
  status: status as ArticleListItemDto['status'],
  version: 1,
  updatedAt: '2026-03-09T00:00:00Z',
});

describe('EditorDashboardSection', () => {
  it('renders section heading', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={5}
        availableArticles={[]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText('Editorial Dashboard')).toBeInTheDocument();
  });

  it('displays stats counters', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[mockArticle('1', 'Article 1', 'EDITORIAL_REVIEW')]}
        completedReviews={12}
        availableArticles={[]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Active Reviews')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Completed Reviews')).toBeInTheDocument();
  });

  it('renders active assignments', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[mockArticle('1', 'My Review Article', 'EDITORIAL_REVIEW')]}
        completedReviews={0}
        availableArticles={[]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText('My Active Reviews')).toBeInTheDocument();
    expect(screen.getByText('My Review Article')).toBeInTheDocument();
  });

  it('renders available articles with claim button', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={0}
        availableArticles={[mockArticle('2', 'Available Article', 'SUBMITTED')]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText('Available to Claim')).toBeInTheDocument();
    expect(screen.getByText('Available Article')).toBeInTheDocument();
    expect(screen.getByText('Claim')).toBeInTheDocument();
  });

  it('shows claim confirmation dialog', () => {
    const onClaim = vi.fn();
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={0}
        availableArticles={[mockArticle('2', 'Available Article', 'SUBMITTED')]}
        onClaim={onClaim}
        isClaiming={false}
      />,
    );
    fireEvent.click(screen.getByText('Claim'));
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClaim when confirmed', () => {
    const onClaim = vi.fn();
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={0}
        availableArticles={[mockArticle('2', 'Available Article', 'SUBMITTED')]}
        onClaim={onClaim}
        isClaiming={false}
      />,
    );
    fireEvent.click(screen.getByText('Claim'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(onClaim).toHaveBeenCalledWith('2');
  });

  it('shows empty state for available articles', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={0}
        availableArticles={[]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText(/No articles available/)).toBeInTheDocument();
  });

  it('collapses when header is clicked', () => {
    render(
      <EditorDashboardSection
        activeAssignments={[]}
        completedReviews={5}
        availableArticles={[]}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );
    expect(screen.getByText('Available to Claim')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Editorial Dashboard'));
    expect(screen.queryByText('Available to Claim')).not.toBeInTheDocument();
  });
});
