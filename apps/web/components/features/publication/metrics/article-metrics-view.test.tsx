import { render, screen } from '@testing-library/react';
import { ArticleMetricsView } from './article-metrics-view';
import type { ArticleDto, ArticleMetricsDto, ArticleRewardAllocationDto } from '@edin/shared';

// Mock recharts to avoid canvas/SVG issues in jsdom
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => null,
  XAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseArticle: ArticleDto = {
  id: 'art-1',
  title: 'Test Article',
  abstract: 'Abstract text',
  domain: 'AI_APPLICATIONS',
  status: 'PUBLISHED',
  publishedAt: '2026-03-01T12:00:00Z',
  authorId: 'author-1',
  editorId: null,
  createdAt: '2026-02-28T12:00:00Z',
  updatedAt: '2026-03-01T12:00:00Z',
};

const fullMetrics: ArticleMetricsDto = {
  totalViews: 150,
  uniqueViews: 120,
  avgTimeOnPageSeconds: 180,
  avgScrollDepthPercent: 75,
  referralSources: [
    { source: 'https://google.com', count: 30 },
    { source: 'https://twitter.com', count: 15 },
  ],
  viewsOverTime: [
    { date: '2026-03-08', views: 10 },
    { date: '2026-03-09', views: 20 },
  ],
  isEmbargoed: false,
  embargoEndsAt: null,
};

const allocation: ArticleRewardAllocationDto = {
  articleId: 'art-1',
  articleTitle: 'Test Article',
  compositeScore: 85.5,
  authorId: 'author-1',
  authorName: 'Author Name',
  editorId: 'editor-1',
  editorName: 'Editor Name',
  authorSharePercent: 80,
  editorSharePercent: 20,
  allocatedAt: '2026-03-01T12:00:00Z',
};

describe('ArticleMetricsView', () => {
  it('should render article title and domain', () => {
    render(<ArticleMetricsView article={baseArticle} metrics={fullMetrics} allocation={null} />);

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('AI_APPLICATIONS')).toBeInTheDocument();
  });

  it('should show embargo state when metrics are embargoed', () => {
    const embargoedMetrics: ArticleMetricsDto = {
      totalViews: 0,
      uniqueViews: 0,
      avgTimeOnPageSeconds: null,
      avgScrollDepthPercent: null,
      referralSources: [],
      viewsOverTime: [],
      isEmbargoed: true,
      embargoEndsAt: '2026-03-03T12:00:00Z',
    };

    render(
      <ArticleMetricsView article={baseArticle} metrics={embargoedMetrics} allocation={null} />,
    );

    expect(screen.getByText('Your article is growing roots.')).toBeInTheDocument();
    expect(screen.getByText(/Metrics will bloom 48 hours/)).toBeInTheDocument();
  });

  it('should show reach section with view counts', () => {
    render(<ArticleMetricsView article={baseArticle} metrics={fullMetrics} allocation={null} />);

    expect(screen.getByText('Reach')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should show engagement section with formatted time', () => {
    render(<ArticleMetricsView article={baseArticle} metrics={fullMetrics} allocation={null} />);

    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('3 minutes')).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('should show referral sources', () => {
    render(<ArticleMetricsView article={baseArticle} metrics={fullMetrics} allocation={null} />);

    expect(screen.getByText('Where readers found you')).toBeInTheDocument();
    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('twitter.com')).toBeInTheDocument();
  });

  it('should show reward split when allocation is provided', () => {
    render(
      <ArticleMetricsView article={baseArticle} metrics={fullMetrics} allocation={allocation} />,
    );

    expect(screen.getByText('Reward Split')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('should not show metrics content when embargoed', () => {
    const embargoedMetrics: ArticleMetricsDto = {
      totalViews: 0,
      uniqueViews: 0,
      avgTimeOnPageSeconds: null,
      avgScrollDepthPercent: null,
      referralSources: [],
      viewsOverTime: [],
      isEmbargoed: true,
      embargoEndsAt: null,
    };

    render(
      <ArticleMetricsView article={baseArticle} metrics={embargoedMetrics} allocation={null} />,
    );

    expect(screen.queryByText('Reach')).not.toBeInTheDocument();
    expect(screen.queryByText('Engagement')).not.toBeInTheDocument();
  });

  it('should hide engagement section when no engagement data', () => {
    const noEngagementMetrics: ArticleMetricsDto = {
      ...fullMetrics,
      avgTimeOnPageSeconds: null,
      avgScrollDepthPercent: null,
    };

    render(
      <ArticleMetricsView article={baseArticle} metrics={noEngagementMetrics} allocation={null} />,
    );

    expect(screen.getByText('Reach')).toBeInTheDocument();
    expect(screen.queryByText('Engagement')).not.toBeInTheDocument();
  });
});
