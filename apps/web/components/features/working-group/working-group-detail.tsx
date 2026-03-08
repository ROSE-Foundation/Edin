'use client';

import Link from 'next/link';
import type { WorkingGroupMember } from '@edin/shared';
import { MemberList } from './member-list';
import { useLeaveWorkingGroup } from '../../../hooks/use-working-groups';

const DOMAIN_TINT: Record<string, string> = {
  Technology: 'bg-[#3A7D7E]/3',
  Fintech: 'bg-[#C49A3C]/3',
  Impact: 'bg-[#B06B6B]/3',
  Governance: 'bg-[#7B6B8A]/3',
};

const DOMAIN_BADGE: Record<string, string> = {
  Technology: 'bg-domain-technology text-white',
  Fintech: 'bg-domain-fintech text-brand-primary',
  Impact: 'bg-domain-impact text-brand-primary',
  Governance: 'bg-domain-governance text-white',
};

interface Contribution {
  id: string;
  title: string;
  contributionType: string;
  createdAt: string;
  contributor: { id: string; name: string; avatarUrl: string | null };
  repository: { fullName: string };
}

interface WorkingGroupDetailProps {
  group: {
    id: string;
    name: string;
    description: string;
    domain: string;
    accentColor: string;
    memberCount: number;
    isMember: boolean;
    members: WorkingGroupMember[];
    recentContributions: Contribution[];
    activeTasks: Array<{
      id: string;
      title: string;
      description: string;
      estimatedEffort: string;
      submissionFormat: string;
    }>;
  };
  isLoading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  COMMIT: 'Commit',
  PULL_REQUEST: 'Pull Request',
  CODE_REVIEW: 'Code Review',
};

export function WorkingGroupDetail({ group, isLoading }: WorkingGroupDetailProps) {
  const leaveMutation = useLeaveWorkingGroup();
  const tint = DOMAIN_TINT[group.domain] ?? '';
  const badge = DOMAIN_BADGE[group.domain] ?? '';

  return (
    <div className={`min-h-screen ${tint}`}>
      <div className="mx-auto max-w-4xl px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/working-groups"
              className="font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
            >
              &larr; Back to Working Groups
            </Link>
            <h1 className="mt-[var(--spacing-sm)] font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
              {group.name}
            </h1>
            <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
              <span
                className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${badge}`}
              >
                {group.domain}
              </span>
              <span className="font-sans text-[13px] text-brand-secondary">
                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {group.isMember && (
            <button
              type="button"
              onClick={() => leaveMutation.mutate(group.id)}
              disabled={leaveMutation.isPending}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken disabled:opacity-50"
              aria-label={`Leave ${group.name} working group`}
            >
              {leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
            </button>
          )}
        </div>

        <p className="mt-[var(--spacing-md)] font-serif text-[16px] leading-[1.65] text-brand-secondary">
          {group.description}
        </p>

        {/* Members Section */}
        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">Members</h2>
          <div className="mt-[var(--spacing-md)]">
            <MemberList members={group.members} isLoading={isLoading} />
          </div>
        </section>

        {/* Recent Contributions Section */}
        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">
            Recent Contributions
          </h2>
          <div className="mt-[var(--spacing-md)]">
            {group.recentContributions.length === 0 ? (
              <p className="font-serif text-[14px] text-brand-secondary">
                No contributions from group members yet.
              </p>
            ) : (
              <div
                className="space-y-[var(--spacing-xs)]"
                role="list"
                aria-label="Recent contributions"
              >
                {group.recentContributions.map((c) => (
                  <div
                    key={c.id}
                    role="listitem"
                    className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)]"
                  >
                    <div className="flex-1">
                      <p className="font-sans text-[14px] font-medium text-brand-primary">
                        {c.title}
                      </p>
                      <p className="font-sans text-[12px] text-brand-secondary">
                        {c.contributor.name} &middot;{' '}
                        {TYPE_LABELS[c.contributionType] ?? c.contributionType} &middot;{' '}
                        {c.repository.fullName}
                      </p>
                    </div>
                    <span className="font-sans text-[12px] text-brand-secondary">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">Active Tasks</h2>
          <div className="mt-[var(--spacing-md)]">
            {group.activeTasks.length === 0 ? (
              <p className="font-serif text-[14px] text-brand-secondary">
                No active tasks are tagged for this domain yet.
              </p>
            ) : (
              <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Active tasks">
                {group.activeTasks.map((task) => (
                  <div
                    key={task.id}
                    role="listitem"
                    className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
                  >
                    <div className="flex flex-col gap-[var(--spacing-xs)] sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-sans text-[14px] font-medium text-brand-primary">
                          {task.title}
                        </p>
                        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] leading-[1.65] text-brand-secondary">
                          {task.description}
                        </p>
                      </div>
                      <span className="font-sans text-[12px] text-brand-secondary">
                        {task.estimatedEffort}
                      </span>
                    </div>
                    <p className="mt-[var(--spacing-sm)] font-sans text-[12px] text-brand-secondary">
                      Submission: {task.submissionFormat}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
