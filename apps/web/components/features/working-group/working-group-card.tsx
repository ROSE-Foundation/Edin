'use client';

import Link from 'next/link';
import type { WorkingGroup } from '@edin/shared';

const DOMAIN_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  Technology: {
    bg: 'bg-[#3A7D7E]/5',
    border: 'border-[#3A7D7E]/20',
    badge: 'bg-domain-technology text-white',
  },
  Finance: {
    bg: 'bg-[#C49A3C]/5',
    border: 'border-[#C49A3C]/20',
    badge: 'bg-domain-finance text-brand-primary',
  },
  Impact: {
    bg: 'bg-[#B06B6B]/5',
    border: 'border-[#B06B6B]/20',
    badge: 'bg-domain-impact text-brand-primary',
  },
  Governance: {
    bg: 'bg-[#7B6B8A]/5',
    border: 'border-[#7B6B8A]/20',
    badge: 'bg-domain-governance text-white',
  },
};

interface WorkingGroupCardProps {
  group: WorkingGroup;
  isMember: boolean;
  onJoin: (id: string) => void;
  isJoining: boolean;
}

export function WorkingGroupCard({ group, isMember, onJoin, isJoining }: WorkingGroupCardProps) {
  const style = DOMAIN_STYLES[group.domain] ?? DOMAIN_STYLES.Technology;

  return (
    <div
      className={`flex flex-col rounded-[var(--radius-lg)] border ${style.border} ${style.bg} p-[var(--spacing-lg)] shadow-[var(--shadow-card)] transition-shadow duration-[var(--transition-fast)] hover:shadow-[var(--shadow-elevated)]`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${style.badge}`}
        >
          {group.domain}
        </span>
        <span className="font-sans text-[13px] text-brand-secondary">
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      <h3 className="mt-[var(--spacing-md)] font-serif text-[18px] font-bold leading-[1.3] text-brand-primary">
        <Link href={`/dashboard/working-groups/${group.id}`} className="hover:underline">
          {group.name}
        </Link>
      </h3>

      <p className="mt-[var(--spacing-sm)] flex-1 font-serif text-[14px] leading-[1.65] text-brand-secondary">
        {group.description}
      </p>

      <div className="mt-[var(--spacing-lg)]">
        {isMember ? (
          <Link
            href={`/dashboard/working-groups/${group.id}`}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken px-[var(--spacing-md)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-raised"
            aria-label={`View ${group.name} working group`}
          >
            Joined
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(group.id)}
            disabled={isJoining}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] font-sans text-[14px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90 disabled:opacity-50"
            aria-label={`Join ${group.name} working group`}
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
}
