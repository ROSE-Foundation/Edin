'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PublicContributorProfile } from '@edin/shared';
import { DOMAIN_COLORS } from '../../../lib/domain-colors';

const ROLE_LABELS: Record<string, string> = {
  CONTRIBUTOR: 'Contributor',
  FOUNDING_CONTRIBUTOR: 'Founding Contributor',
  EDITOR: 'Editor',
  WORKING_GROUP_LEAD: 'Working Group Lead',
  ADMIN: 'Admin',
};

interface ContributorRosterCardProps {
  contributor: PublicContributorProfile;
}

export function ContributorRosterCard({ contributor }: ContributorRosterCardProps) {
  const domainColor = contributor.domain ? DOMAIN_COLORS[contributor.domain] : null;
  const roleLabel = ROLE_LABELS[contributor.role] ?? contributor.role;

  return (
    <Link
      href={`/contributors/${contributor.id}`}
      className="group block rounded-[12px] border border-[#E8E6E1] bg-surface-raised p-[var(--spacing-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-[var(--transition-fast)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`View ${contributor.name}'s profile`}
    >
      <div className="flex items-start gap-[var(--spacing-md)]">
        {/* Avatar */}
        {contributor.avatarUrl ? (
          <Image
            src={contributor.avatarUrl}
            alt={contributor.name}
            width={64}
            height={64}
            className="h-[64px] w-[64px] shrink-0 rounded-full border-2 border-surface-subtle object-cover"
          />
        ) : (
          <div
            className={`flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border-2 ${domainColor ? `${domainColor.bg} ${domainColor.border}` : 'border-surface-subtle bg-surface-sunken'}`}
            aria-hidden="true"
          >
            <span
              className={`font-sans text-[24px] font-medium ${domainColor ? domainColor.text : 'text-text-secondary'}`}
            >
              {contributor.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name */}
          <h3 className="font-sans text-[1.25rem] leading-[1.3] font-semibold text-text-primary">
            {contributor.name}
          </h3>

          {/* Badges */}
          <div className="mt-[var(--spacing-xs)] flex flex-wrap gap-[var(--spacing-xs)]">
            {contributor.domain && domainColor && (
              <span
                className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
              >
                {contributor.domain}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-text-secondary">
              {roleLabel}
            </span>
          </div>

          {/* Bio */}
          {contributor.bio && (
            <p className="mt-[var(--spacing-sm)] line-clamp-2 font-sans text-[15px] leading-[1.5] font-normal text-text-secondary">
              {contributor.bio}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
