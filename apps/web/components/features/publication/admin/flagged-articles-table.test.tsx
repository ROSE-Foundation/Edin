import { render, screen, fireEvent } from '@testing-library/react';
import { FlaggedArticlesTable } from './flagged-articles-table';
import type { FlaggedArticleDto } from '@edin/shared';

const mockFetchNextPage = vi.fn();
const mockDismissMutateAsync = vi.fn();
const mockCorrectionsMutateAsync = vi.fn();
const mockRejectMutateAsync = vi.fn();

const mockUseFlaggedArticles = vi.fn();
vi.mock('../../../../hooks/use-moderation', () => ({
  useFlaggedArticles: (...args: unknown[]) => mockUseFlaggedArticles(...args),
  useDismissFlag: () => ({
    mutateAsync: mockDismissMutateAsync,
    isPending: false,
  }),
  useRequestCorrections: () => ({
    mutateAsync: mockCorrectionsMutateAsync,
    isPending: false,
  }),
  useRejectArticle: () => ({
    mutateAsync: mockRejectMutateAsync,
    isPending: false,
  }),
}));

vi.mock('./moderation-detail-dialog', () => ({
  ModerationDetailDialog: ({
    article,
    onClose,
  }: {
    article: FlaggedArticleDto;
    onClose: () => void;
  }) => (
    <div data-testid="detail-dialog">
      <span>{article.articleTitle}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./moderation-action-dialog', () => ({
  ModerationActionDialog: ({
    action,
    onConfirm,
    onCancel,
  }: {
    action: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="action-dialog">
      <span data-testid="action-type">{action}</span>
      <button onClick={() => onConfirm('test reason')}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

function createFlaggedArticle(overrides: Partial<FlaggedArticleDto> = {}): FlaggedArticleDto {
  return {
    articleId: 'a1',
    articleTitle: 'Flagged Article Title',
    articleSlug: 'flagged-article',
    authorId: 'u1',
    authorName: 'John Author',
    domain: 'TECHNOLOGY',
    submittedAt: '2026-03-01T12:00:00Z',
    moderationReport: {
      id: 'r1',
      plagiarismScore: 0.45,
      aiContentScore: 0.1,
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

describe('FlaggedArticlesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [],
      isLoading: true,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render empty state when no flagged articles', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);
    expect(screen.getByText('No flagged articles require review')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [],
      isLoading: false,
      error: new Error('Network error'),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);
    expect(
      screen.getByText('Failed to load flagged articles. Please try again.'),
    ).toBeInTheDocument();
  });

  it('should render flagged articles in a table', () => {
    const articles = [
      createFlaggedArticle(),
      createFlaggedArticle({
        articleId: 'a2',
        articleTitle: 'Second Flagged Article',
        authorName: 'Jane Author',
        moderationReport: {
          id: 'r2',
          plagiarismScore: 0.1,
          aiContentScore: 0.7,
          flagType: 'AI_CONTENT',
          isFlagged: true,
          flaggedPassages: [],
          status: 'FLAGGED',
          adminId: null,
          adminAction: null,
          adminReason: null,
          resolvedAt: null,
          createdAt: '2026-03-02T12:00:00Z',
        },
      }),
    ];

    mockUseFlaggedArticles.mockReturnValue({
      articles,
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    expect(screen.getByText('Flagged Article Title')).toBeInTheDocument();
    expect(screen.getByText('John Author')).toBeInTheDocument();
    expect(screen.getByText('Plagiarism')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();

    expect(screen.getByText('Second Flagged Article')).toBeInTheDocument();
    expect(screen.getByText('Jane Author')).toBeInTheDocument();
    expect(screen.getByText('AI Content')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('should show View Report dialog when button clicked', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    fireEvent.click(screen.getByText('View Report'));
    expect(screen.getByTestId('detail-dialog')).toBeInTheDocument();
  });

  it('should show action dialog when Dismiss clicked', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.getByTestId('action-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('action-type')).toHaveTextContent('DISMISS');
  });

  it('should show action dialog when Corrections clicked', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    fireEvent.click(screen.getByText('Corrections'));
    expect(screen.getByTestId('action-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('action-type')).toHaveTextContent('REQUEST_CORRECTIONS');
  });

  it('should show action dialog when Reject clicked', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    fireEvent.click(screen.getByText('Reject'));
    expect(screen.getByTestId('action-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('action-type')).toHaveTextContent('REJECT');
  });

  it('should render Load more button when hasNextPage is true', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);

    const loadMore = screen.getByText('Load more');
    expect(loadMore).toBeInTheDocument();
    fireEvent.click(loadMore);
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('should not render Load more when hasNextPage is false', () => {
    mockUseFlaggedArticles.mockReturnValue({
      articles: [createFlaggedArticle()],
      isLoading: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
    });

    render(<FlaggedArticlesTable />);
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });
});
