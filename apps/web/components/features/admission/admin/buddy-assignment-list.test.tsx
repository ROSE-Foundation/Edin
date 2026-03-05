import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuddyAssignmentList } from './buddy-assignment-list';

const mockUseBuddyAssignmentList = vi.fn();
const mockUseEligibleBuddies = vi.fn();
const mockUseOverrideBuddyAssignment = vi.fn();

vi.mock('../../../../hooks/use-buddy-admin', () => ({
  useBuddyAssignmentList: (...args: unknown[]) => mockUseBuddyAssignmentList(...args),
  useEligibleBuddies: (...args: unknown[]) => mockUseEligibleBuddies(...args),
  useOverrideBuddyAssignment: () => mockUseOverrideBuddyAssignment(),
}));

vi.mock('../../../ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockAssignments = [
  {
    id: 'assign-1',
    contributorId: 'contrib-1',
    buddyId: 'buddy-1',
    assignedAt: '2026-03-01T00:00:00.000Z',
    expiresAt: '2026-03-31T00:00:00.000Z',
    isActive: true,
    notes: null,
    contributor: { id: 'contrib-1', name: 'New User', domain: 'Technology', avatarUrl: null },
    buddy: { id: 'buddy-1', name: 'Alice Mentor', domain: 'Technology', avatarUrl: null },
  },
];

describe('BuddyAssignmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEligibleBuddies.mockReturnValue({ buddies: [], isLoading: false, error: null });
    mockUseOverrideBuddyAssignment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders table with assignments', () => {
    mockUseBuddyAssignmentList.mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      pagination: { cursor: null, hasMore: false, total: 1 },
    });

    renderWithProviders(<BuddyAssignmentList />);

    expect(screen.getByText('Buddy Assignments')).toBeTruthy();
    expect(screen.getByText('New User')).toBeTruthy();
    expect(screen.getByText('Alice Mentor')).toBeTruthy();
    expect(screen.getByText('Override')).toBeTruthy();
  });

  it('renders loading skeletons', () => {
    mockUseBuddyAssignmentList.mockReturnValue({
      assignments: [],
      isLoading: true,
      pagination: null,
    });

    const { container } = renderWithProviders(<BuddyAssignmentList />);

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state', () => {
    mockUseBuddyAssignmentList.mockReturnValue({
      assignments: [],
      isLoading: false,
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    renderWithProviders(<BuddyAssignmentList />);

    expect(screen.getByText('No buddy assignments found.')).toBeTruthy();
  });

  it('shows domain filter select', () => {
    mockUseBuddyAssignmentList.mockReturnValue({
      assignments: [],
      isLoading: false,
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    renderWithProviders(<BuddyAssignmentList />);

    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
  });
});
