import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WgLeadDashboard } from './wg-lead-dashboard';

const mockCreateAnnouncement = vi.fn();
const mockDeleteAnnouncement = vi.fn();
const mockReorderTasks = vi.fn();

vi.mock('../../../hooks/use-working-group-lead', () => ({
  useCreateAnnouncement: () => ({
    mutate: mockCreateAnnouncement,
    isPending: false,
  }),
  useDeleteAnnouncement: () => ({
    mutate: mockDeleteAnnouncement,
    isPending: false,
  }),
  useReorderTasks: () => ({
    mutate: mockReorderTasks,
    isPending: false,
  }),
}));

vi.mock('../../../hooks/use-admission-admin', () => ({
  useDomainApplications: () => ({
    applications: [
      {
        id: 'app-1',
        applicantName: 'Grace Hopper',
        domain: 'Technology',
        createdAt: '2026-03-08T10:00:00.000Z',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const baseProps = {
  workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
  domain: 'Technology' as const,
  healthIndicators: {
    activeMembers: 5,
    contributionVelocity: 12,
    totalContributions: 42,
  },
  announcements: [
    {
      id: 'ann-1',
      workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
      authorId: 'user-1',
      content: 'Sprint planning tomorrow at 10am.',
      createdAt: '2026-03-07T10:00:00.000Z',
      author: { id: 'user-1', name: 'Ada Lovelace', avatarUrl: null },
    },
  ],
  tasks: [
    { id: 'task-1', title: 'Build API', status: 'AVAILABLE', sortOrder: 1 },
    { id: 'task-2', title: 'Write tests', status: 'CLAIMED', sortOrder: 2 },
  ],
  members: [
    {
      id: 'member-1',
      workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
      contributorId: 'user-1',
      joinedAt: '2026-03-07T00:00:00.000Z',
      recentContributionCount: 3,
      contributor: {
        id: 'user-1',
        name: 'Ada Lovelace',
        avatarUrl: null,
        domain: 'Technology' as const,
        role: 'WORKING_GROUP_LEAD',
      },
    },
  ],
  currentUserId: 'user-1',
  isAdmin: false,
};

describe('WgLeadDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders domain health indicators', () => {
    render(<WgLeadDashboard {...baseProps} />);

    expect(screen.getByText('Domain Health')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Weekly Contributions')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Total Contributions')).toBeInTheDocument();
  });

  it('renders announcements section with existing announcement', () => {
    render(<WgLeadDashboard {...baseProps} />);

    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Sprint planning tomorrow at 10am.')).toBeInTheDocument();
  });

  it('renders task priority section with tasks', () => {
    render(<WgLeadDashboard {...baseProps} />);

    expect(screen.getByText('Task Priority')).toBeInTheDocument();
    expect(screen.getByText('Build API')).toBeInTheDocument();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('renders member activity and pending reviews sections', () => {
    render(<WgLeadDashboard {...baseProps} />);

    expect(screen.getByText('Member Activity')).toBeInTheDocument();
    expect(screen.getByText(/3 recent contributions/)).toBeInTheDocument();
    expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('shows empty state when no announcements', () => {
    render(<WgLeadDashboard {...baseProps} announcements={[]} />);

    expect(screen.getByText('No announcements yet.')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<WgLeadDashboard {...baseProps} tasks={[]} />);

    expect(screen.getByText('No tasks to prioritize.')).toBeInTheDocument();
  });

  it('submits a new announcement via form', async () => {
    const user = userEvent.setup();
    render(<WgLeadDashboard {...baseProps} />);

    const textarea = screen.getByPlaceholderText(
      'Write an announcement for your domain members...',
    );
    await user.type(textarea, 'New sprint update');
    await user.click(screen.getByText('Post Announcement'));

    expect(mockCreateAnnouncement).toHaveBeenCalledWith(
      {
        workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'New sprint update',
      },
      expect.any(Object),
    );
  });

  it('shows delete button for own announcements', () => {
    render(<WgLeadDashboard {...baseProps} />);

    expect(screen.getByLabelText('Delete announcement from Ada Lovelace')).toBeInTheDocument();
  });
});
