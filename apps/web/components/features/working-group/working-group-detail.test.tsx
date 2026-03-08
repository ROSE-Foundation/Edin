import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkingGroupDetail } from './working-group-detail';

const taskHookState = {
  tasks: [
    {
      id: '880e8400-e29b-41d4-a716-446655440000',
      title: 'Build a REST API endpoint',
      description: 'Design and implement a single REST API endpoint.',
      domain: 'Technology',
      difficulty: 'INTERMEDIATE',
      estimatedEffort: '2-4 hours',
      status: 'AVAILABLE',
      sortOrder: 0,
      claimedById: null,
      claimedAt: null,
      completedAt: null,
      createdById: 'creator-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const authState = {
  user: { id: 'current-user', role: 'CONTRIBUTOR' as string },
};

const leadDashboardState = {
  dashboard: null as {
    healthIndicators: {
      activeMembers: number;
      contributionVelocity: number;
      totalContributions: number;
    };
    announcements: Array<{
      id: string;
      workingGroupId: string;
      authorId: string;
      content: string;
      createdAt: string;
      author: { id: string; name: string; avatarUrl: string | null };
    }>;
    tasks: Array<{ id: string; title: string; status: string; sortOrder: number }>;
    members: Array<{
      id: string;
      workingGroupId: string;
      contributorId: string;
      joinedAt: string;
      recentContributionCount?: number;
      contributor: {
        id: string;
        name: string;
        avatarUrl: string | null;
        domain: 'Technology' | 'Fintech' | 'Impact' | 'Governance' | null;
        role: string;
      };
    }>;
  } | null,
};

vi.mock('../../../hooks/use-working-groups', () => ({
  useLeaveWorkingGroup: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../../hooks/use-working-group-lead', () => ({
  useLeadDashboard: () => ({
    dashboard: leadDashboardState.dashboard,
    isPending: false,
    error: null,
  }),
  useCreateAnnouncement: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAnnouncement: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderTasks: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../../hooks/use-tasks', () => ({
  useTasks: () => ({
    tasks: taskHookState.tasks,
    isPending: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useClaimTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutate: vi.fn(), isPending: false }),
  useRetireTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('../../../hooks/use-admission-admin', () => ({
  useDomainApplications: () => ({
    applications: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const group = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Technology',
  description: 'Build the platform.',
  domain: 'Technology',
  accentColor: '#3A7D7E',
  memberCount: 1,
  isMember: true,
  members: [
    {
      id: '660e8400-e29b-41d4-a716-446655440000',
      workingGroupId: '550e8400-e29b-41d4-a716-446655440000',
      contributorId: '770e8400-e29b-41d4-a716-446655440000',
      joinedAt: '2026-03-06T00:00:00.000Z',
      contributor: {
        id: '770e8400-e29b-41d4-a716-446655440000',
        name: 'Ada Lovelace',
        avatarUrl: null,
        domain: 'Technology' as const,
        role: 'CONTRIBUTOR',
      },
    },
  ],
  recentContributions: [],
  activeTasks: [],
};

describe('WorkingGroupDetail', () => {
  beforeEach(() => {
    taskHookState.tasks = [
      {
        id: '880e8400-e29b-41d4-a716-446655440000',
        title: 'Build a REST API endpoint',
        description: 'Design and implement a single REST API endpoint.',
        domain: 'Technology',
        difficulty: 'INTERMEDIATE',
        estimatedEffort: '2-4 hours',
        status: 'AVAILABLE',
        sortOrder: 0,
        claimedById: null,
        claimedAt: null,
        completedAt: null,
        createdById: 'creator-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    authState.user = { id: 'current-user', role: 'CONTRIBUTOR' };
    leadDashboardState.dashboard = null;
  });

  it('renders active tasks from the task system', () => {
    render(<WorkingGroupDetail group={group} isLoading={false} />);

    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('Build a REST API endpoint')).toBeInTheDocument();
    expect(screen.getByText('2-4 hours')).toBeInTheDocument();
  });

  it('shows empty state when no domain tasks exist', () => {
    taskHookState.tasks = [];

    render(<WorkingGroupDetail group={group} isLoading={false} />);

    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('No active tasks are tagged for this domain yet.')).toBeInTheDocument();
  });

  it('renders announcement banner when group has announcements', () => {
    const groupWithAnnouncement = {
      ...group,
      announcements: [
        {
          id: 'ann-1',
          workingGroupId: group.id,
          authorId: 'user-1',
          content: 'Welcome to Technology!',
          createdAt: '2026-03-07T10:00:00.000Z',
          author: { id: 'user-1', name: 'Ada Lovelace', avatarUrl: null },
        },
      ],
    };

    render(<WorkingGroupDetail group={groupWithAnnouncement} isLoading={false} />);

    expect(screen.getByText('Welcome to Technology!')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Latest announcement' })).toBeInTheDocument();
  });

  it('does not render announcement banner when no announcements', () => {
    render(<WorkingGroupDetail group={group} isLoading={false} />);

    expect(screen.queryByRole('region', { name: 'Latest announcement' })).not.toBeInTheDocument();
  });

  it('does not show lead dashboard for non-lead users', () => {
    render(<WorkingGroupDetail group={group} isLoading={false} />);

    expect(screen.queryByText('Lead Dashboard')).not.toBeInTheDocument();
  });

  it('shows lead dashboard when user is the group lead and dashboard data is available', () => {
    const leadId = 'lead-user-id';
    authState.user = { id: leadId, role: 'WORKING_GROUP_LEAD' };
    leadDashboardState.dashboard = {
      healthIndicators: { activeMembers: 3, contributionVelocity: 8, totalContributions: 25 },
      announcements: [],
      tasks: [{ id: 'task-1', title: 'Task A', status: 'AVAILABLE', sortOrder: 1 }],
      members: [
        {
          id: 'member-1',
          workingGroupId: group.id,
          contributorId: leadId,
          joinedAt: '2026-03-07T00:00:00.000Z',
          recentContributionCount: 2,
          contributor: {
            id: leadId,
            name: 'Lead User',
            avatarUrl: null,
            domain: 'Technology',
            role: 'WORKING_GROUP_LEAD',
          },
        },
      ],
    };

    const groupWithLead = {
      ...group,
      leadContributor: { id: leadId, name: 'Lead User', avatarUrl: null },
    };

    render(<WorkingGroupDetail group={groupWithLead} isLoading={false} />);

    expect(screen.getByText('Lead Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Domain Health')).toBeInTheDocument();
  });

  it('does not show lead dashboard when user is lead but dashboard data is null', () => {
    const leadId = 'lead-user-id';
    authState.user = { id: leadId, role: 'WORKING_GROUP_LEAD' };
    leadDashboardState.dashboard = null;

    const groupWithLead = {
      ...group,
      leadContributor: { id: leadId, name: 'Lead User', avatarUrl: null },
    };

    render(<WorkingGroupDetail group={groupWithLead} isLoading={false} />);

    expect(screen.queryByText('Lead Dashboard')).not.toBeInTheDocument();
  });
});
