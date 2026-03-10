import { render, screen } from '@testing-library/react';
import { EditorRewardSummary } from './editor-reward-summary';
import type { EditorRewardSummaryDto } from '@edin/shared';

const summaryWithAllocations: EditorRewardSummaryDto = {
  totalReviewed: 10,
  totalPublished: 7,
  averageScore: 82.3,
  allocations: [
    {
      articleId: 'art-1',
      articleTitle: 'First Article',
      compositeScore: 90.0,
      authorId: 'au-1',
      authorName: 'Alice Author',
      editorId: 'ed-1',
      editorName: 'Bob Editor',
      authorSharePercent: 80,
      editorSharePercent: 20,
      allocatedAt: '2026-03-01T12:00:00Z',
    },
    {
      articleId: 'art-2',
      articleTitle: 'Second Article',
      compositeScore: null,
      authorId: 'au-2',
      authorName: 'Charlie Writer',
      editorId: 'ed-1',
      editorName: 'Bob Editor',
      authorSharePercent: 80,
      editorSharePercent: 20,
      allocatedAt: '2026-03-02T12:00:00Z',
    },
  ],
};

const emptySummary: EditorRewardSummaryDto = {
  totalReviewed: 0,
  totalPublished: 0,
  averageScore: null,
  allocations: [],
};

describe('EditorRewardSummary', () => {
  it('should show empty state when no allocations', () => {
    render(<EditorRewardSummary summary={emptySummary} />);

    expect(screen.getByText('Your Editorial Contributions')).toBeInTheDocument();
    expect(screen.getByText(/No published articles with reward allocations/)).toBeInTheDocument();
  });

  it('should show summary stats', () => {
    render(<EditorRewardSummary summary={summaryWithAllocations} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Articles reviewed')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('82.3')).toBeInTheDocument();
    expect(screen.getByText('Avg. score')).toBeInTheDocument();
  });

  it('should list allocations with article titles and authors', () => {
    render(<EditorRewardSummary summary={summaryWithAllocations} />);

    expect(screen.getByText('First Article')).toBeInTheDocument();
    expect(screen.getByText('by Alice Author')).toBeInTheDocument();
    expect(screen.getByText('Second Article')).toBeInTheDocument();
    expect(screen.getByText('by Charlie Writer')).toBeInTheDocument();
  });

  it('should show composite score when available', () => {
    render(<EditorRewardSummary summary={summaryWithAllocations} />);

    expect(screen.getByText('90.0')).toBeInTheDocument();
  });

  it('should show editor share percentage', () => {
    render(<EditorRewardSummary summary={summaryWithAllocations} />);

    const shares = screen.getAllByText('20% editorial share');
    expect(shares).toHaveLength(2);
  });

  it('should hide average score when null', () => {
    render(<EditorRewardSummary summary={emptySummary} />);

    expect(screen.queryByText('Avg. score')).not.toBeInTheDocument();
  });
});
