import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingStatusList } from './onboarding-status-list';

// Mock the hook
vi.mock('../../../../hooks/use-onboarding-admin', () => ({
  useOnboardingStatusList: vi.fn(),
}));

import { useOnboardingStatusList } from '../../../../hooks/use-onboarding-admin';

const mockUseOnboardingStatusList = vi.mocked(useOnboardingStatusList);

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockStatuses = [
  {
    contributorId: 'c-1',
    contributorName: 'Jane Doe',
    contributorDomain: 'Technology',
    ignitionStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    milestones: [
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
    ],
    isWithin72Hours: true,
    isComplete: false,
    isAtRisk: false,
    isExpired: false,
    hoursElapsed: 24.0,
  },
  {
    contributorId: 'c-2',
    contributorName: 'At Risk Contributor',
    contributorDomain: 'Finance',
    ignitionStartedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    milestones: [
      {
        id: 'ms-3',
        contributorId: 'c-2',
        milestoneType: 'ACCOUNT_ACTIVATED' as const,
        completedAt: new Date().toISOString(),
        metadata: null,
      },
    ],
    isWithin72Hours: true,
    isComplete: false,
    isAtRisk: true,
    isExpired: false,
    hoursElapsed: 50.0,
  },
];

describe('OnboardingStatusList', () => {
  it('renders the heading', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: [],
      isLoading: false,
      error: null,
      pagination: null,
    });

    renderWithQuery(<OnboardingStatusList />);

    expect(screen.getByText('Onboarding Status')).toBeTruthy();
  });

  it('renders table with contributor data', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: mockStatuses,
      isLoading: false,
      error: null,
      pagination: { cursor: null, hasMore: false, total: 2 },
    });

    renderWithQuery(<OnboardingStatusList />);

    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('At Risk Contributor')).toBeTruthy();
  });

  it('renders at-risk row with amber border', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: mockStatuses,
      isLoading: false,
      error: null,
      pagination: { cursor: null, hasMore: false, total: 2 },
    });

    const { container } = renderWithQuery(<OnboardingStatusList />);

    const amberRows = container.querySelectorAll('.border-l-amber-400');
    expect(amberRows.length).toBe(1);
  });

  it('renders status badges', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: mockStatuses,
      isLoading: false,
      error: null,
      pagination: { cursor: null, hasMore: false, total: 2 },
    });

    renderWithQuery(<OnboardingStatusList />);

    // "In Progress" appears in both filter select option and status badge
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(2);
    // "At Risk" appears in both filter select option and status badge
    expect(screen.getAllByText('At Risk').length).toBeGreaterThanOrEqual(2);
  });

  it('renders empty state', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: [],
      isLoading: false,
      error: null,
      pagination: null,
    });

    renderWithQuery(<OnboardingStatusList />);

    expect(screen.getByText('No onboarding records found.')).toBeTruthy();
  });

  it('renders status filter select', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: [],
      isLoading: false,
      error: null,
      pagination: null,
    });

    renderWithQuery(<OnboardingStatusList />);

    expect(screen.getByText('All statuses')).toBeTruthy();
    expect(screen.getByText('At Risk')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Expired')).toBeTruthy();
  });

  it('renders loading skeleton rows', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: [],
      isLoading: true,
      error: null,
      pagination: null,
    });

    const { container } = renderWithQuery(<OnboardingStatusList />);

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders domain badges', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: mockStatuses,
      isLoading: false,
      error: null,
      pagination: { cursor: null, hasMore: false, total: 2 },
    });

    renderWithQuery(<OnboardingStatusList />);

    expect(screen.getByText('Technology')).toBeTruthy();
    expect(screen.getByText('Finance')).toBeTruthy();
  });

  it('renders milestone dots for each contributor', () => {
    mockUseOnboardingStatusList.mockReturnValue({
      statuses: mockStatuses,
      isLoading: false,
      error: null,
      pagination: { cursor: null, hasMore: false, total: 2 },
    });

    const { container } = renderWithQuery(<OnboardingStatusList />);

    // Each row has 5 milestone dots, 2 rows = 10 dots
    const milestoneDots = container.querySelectorAll('[title]');
    expect(milestoneDots.length).toBe(10);
  });
});
