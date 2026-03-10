import { render, screen } from '@testing-library/react';
import { RewardSplitBadge } from './reward-split-badge';
import type { ArticleRewardAllocationDto } from '@edin/shared';

const allocationWithEditor: ArticleRewardAllocationDto = {
  articleId: 'art-1',
  articleTitle: 'Test Article',
  compositeScore: 85.5,
  authorId: 'author-1',
  authorName: 'Alice Author',
  editorId: 'editor-1',
  editorName: 'Bob Editor',
  authorSharePercent: 80,
  editorSharePercent: 20,
  allocatedAt: '2026-03-01T12:00:00Z',
};

const allocationNoEditor: ArticleRewardAllocationDto = {
  articleId: 'art-2',
  articleTitle: 'Solo Article',
  compositeScore: null,
  authorId: 'author-1',
  authorName: 'Alice Author',
  editorId: null,
  editorName: null,
  authorSharePercent: 100,
  editorSharePercent: 0,
  allocatedAt: '2026-03-01T12:00:00Z',
};

describe('RewardSplitBadge', () => {
  describe('full mode', () => {
    it('should show reward split heading and author/editor percentages', () => {
      render(<RewardSplitBadge allocation={allocationWithEditor} />);

      expect(screen.getByText('Reward Split')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('Alice Author')).toBeInTheDocument();
      expect(screen.getByText('Bob Editor')).toBeInTheDocument();
    });

    it('should show composite score when available', () => {
      render(<RewardSplitBadge allocation={allocationWithEditor} />);

      expect(screen.getByText('Evaluation Score')).toBeInTheDocument();
      expect(screen.getByText('85.5')).toBeInTheDocument();
    });

    it('should hide editor section when no editor', () => {
      render(<RewardSplitBadge allocation={allocationNoEditor} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.queryByText('Bob Editor')).not.toBeInTheDocument();
      expect(screen.queryByText('Editor')).not.toBeInTheDocument();
    });

    it('should hide score section when no composite score', () => {
      render(<RewardSplitBadge allocation={allocationNoEditor} />);

      expect(screen.queryByText('Evaluation Score')).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should show inline author/editor percentages', () => {
      render(<RewardSplitBadge allocation={allocationWithEditor} compact />);

      expect(screen.getByText(/Author: 80%/)).toBeInTheDocument();
      expect(screen.getByText(/Editor: 20%/)).toBeInTheDocument();
    });

    it('should show score in compact mode', () => {
      render(<RewardSplitBadge allocation={allocationWithEditor} compact />);

      expect(screen.getByText(/Score: 85.5/)).toBeInTheDocument();
    });

    it('should not show Reward Split heading in compact mode', () => {
      render(<RewardSplitBadge allocation={allocationWithEditor} compact />);

      expect(screen.queryByText('Reward Split')).not.toBeInTheDocument();
    });
  });
});
