import { render, screen, fireEvent } from '@testing-library/react';
import { ModerationDetailDialog } from './moderation-detail-dialog';
import type { FlaggedArticleDto } from '@edin/shared';

function createArticle(overrides: Partial<FlaggedArticleDto> = {}): FlaggedArticleDto {
  return {
    articleId: 'a1',
    articleTitle: 'Test Flagged Article',
    articleSlug: 'test-flagged',
    authorId: 'u1',
    authorName: 'John Author',
    domain: 'TECHNOLOGY',
    submittedAt: '2026-03-01T12:00:00Z',
    moderationReport: {
      id: 'r1',
      plagiarismScore: 0.45,
      aiContentScore: 0.2,
      flagType: 'PLAGIARISM',
      isFlagged: true,
      flaggedPassages: [],
      status: 'FLAGGED',
      adminId: null,
      adminAction: null,
      adminReason: null,
      resolvedAt: null,
      createdAt: '2026-03-01T12:00:00Z',
    },
    ...overrides,
  };
}

describe('ModerationDetailDialog', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onDismiss: vi.fn(),
    onRequestCorrections: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render article title and scores', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    expect(screen.getByText('Moderation Report')).toBeInTheDocument();
    expect(screen.getByText('Test Flagged Article')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('Plagiarism Score')).toBeInTheDocument();
    expect(screen.getByText('AI Content Score')).toBeInTheDocument();
  });

  it('should display flag type label', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);
    expect(screen.getByText('Flagged: Plagiarism')).toBeInTheDocument();
  });

  it('should display AI Content flag type', () => {
    const article = createArticle({
      moderationReport: {
        ...createArticle().moderationReport,
        flagType: 'AI_CONTENT',
        aiContentScore: 0.75,
      },
    });

    render(<ModerationDetailDialog article={article} {...defaultProps} />);
    expect(screen.getByText('Flagged: AI Content')).toBeInTheDocument();
  });

  it('should render flagged passages', () => {
    const article = createArticle({
      moderationReport: {
        ...createArticle().moderationReport,
        flaggedPassages: [
          {
            start: 0,
            end: 46,
            text: 'This is a copied passage from another article',
            type: 'PLAGIARISM',
            source: 'original-article',
            similarity: 0.85,
          },
        ],
      },
    });

    render(<ModerationDetailDialog article={article} {...defaultProps} />);
    expect(screen.getByText('Flagged Passages')).toBeInTheDocument();
    expect(screen.getByText(/This is a copied passage/)).toBeInTheDocument();
    expect(screen.getByText('Source: original-article')).toBeInTheDocument();
  });

  it('should show author and domain info', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);
    expect(screen.getByText(/John Author/)).toBeInTheDocument();
    expect(screen.getByText(/TECHNOLOGY/)).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should call onDismiss with articleId when Dismiss Flag clicked', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    fireEvent.click(screen.getByText('Dismiss Flag'));
    expect(defaultProps.onDismiss).toHaveBeenCalledWith('a1');
  });

  it('should call onRequestCorrections with articleId when Request Corrections clicked', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    fireEvent.click(screen.getByText('Request Corrections'));
    expect(defaultProps.onRequestCorrections).toHaveBeenCalledWith('a1');
  });

  it('should call onReject with articleId when Reject clicked', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    fireEvent.click(screen.getByText('Reject'));
    expect(defaultProps.onReject).toHaveBeenCalledWith('a1');
  });

  it('should close when clicking backdrop', () => {
    render(<ModerationDetailDialog article={createArticle()} {...defaultProps} />);

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
