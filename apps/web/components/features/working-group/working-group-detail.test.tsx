import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkingGroupDetail } from './working-group-detail';

vi.mock('../../../hooks/use-working-groups', () => ({
  useLeaveWorkingGroup: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
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
        domain: 'Technology',
        role: 'CONTRIBUTOR',
      },
    },
  ],
  recentContributions: [],
  activeTasks: [
    {
      id: '880e8400-e29b-41d4-a716-446655440000',
      title: 'Build a REST API endpoint',
      description: 'Design and implement a single REST API endpoint.',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'GitHub repository link or gist',
    },
  ],
};

describe('WorkingGroupDetail', () => {
  it('renders active tasks instead of a placeholder message', () => {
    render(<WorkingGroupDetail group={group} isLoading={false} />);

    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('Build a REST API endpoint')).toBeInTheDocument();
    expect(screen.getByText('2-4 hours')).toBeInTheDocument();
    expect(screen.getByText(/Submission: GitHub repository link or gist/)).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Domain-specific tasks will be available here once the task management module is implemented.',
      ),
    ).not.toBeInTheDocument();
  });
});
