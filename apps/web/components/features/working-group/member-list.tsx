'use client';

import Image from 'next/image';
import type { WorkingGroupMember } from '@edin/shared';

interface MemberListProps {
  members: WorkingGroupMember[];
  isLoading: boolean;
}

function MemberListSkeleton() {
  return (
    <div className="space-y-[var(--spacing-sm)]" aria-label="Loading members">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-sm)]"
        >
          <div className="skeleton h-[40px] w-[40px] rounded-full" />
          <div className="flex-1">
            <div className="skeleton h-[16px] w-[120px]" />
            <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-[80px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemberList({ members, isLoading }: MemberListProps) {
  if (isLoading) {
    return <MemberListSkeleton />;
  }

  if (members.length === 0) {
    return (
      <p className="font-serif text-[14px] text-text-secondary">
        No members yet. Be the first to join!
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-xs)]" role="list" aria-label="Working group members">
      {members.map((member) => (
        <div
          key={member.id}
          role="listitem"
          className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-sm)]"
        >
          {member.contributor?.avatarUrl ? (
            <Image
              src={member.contributor.avatarUrl}
              alt={`${member.contributor.name}'s avatar`}
              width={40}
              height={40}
              className="h-[40px] w-[40px] shrink-0 rounded-full border border-surface-subtle object-cover"
            />
          ) : (
            <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-surface-subtle bg-surface-sunken">
              <span className="font-sans text-[16px] font-medium text-text-secondary">
                {member.contributor?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <p className="font-sans text-[14px] font-medium text-text-primary">
              {member.contributor?.name ?? 'Unknown'}
            </p>
            <p className="font-sans text-[12px] text-text-secondary">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
              {typeof member.recentContributionCount === 'number'
                ? ` · ${member.recentContributionCount} recent ${
                    member.recentContributionCount === 1 ? 'contribution' : 'contributions'
                  }`
                : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
