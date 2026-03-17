'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PublicContributorProfile } from '@edin/shared';
import { DOMAIN_COLORS } from '../../../lib/domain-colors';

interface FoundingContributorCardProps {
  contributor: PublicContributorProfile;
}

export function FoundingContributorCard({ contributor }: FoundingContributorCardProps) {
  const domainColor = contributor.domain ? DOMAIN_COLORS[contributor.domain] : null;

  return (
    <Link
      href={`/contributors/${contributor.id}`}
      className="group block rounded-[12px] border border-[#E8E6E1] bg-surface-raised p-[var(--spacing-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-[var(--transition-fast)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`View ${contributor.name}'s profile`}
    >
      {/* Avatar */}
      <div className="flex justify-center">
        {contributor.avatarUrl ? (
          <Image
            src={contributor.avatarUrl}
            alt={contributor.name}
            width={80}
            height={80}
            className="h-[80px] w-[80px] rounded-full border-2 border-surface-subtle object-cover"
          />
        ) : (
          <div
            className={`flex h-[80px] w-[80px] items-center justify-center rounded-full border-2 ${domainColor ? `${domainColor.bg} ${domainColor.border}` : 'border-surface-subtle bg-surface-sunken'}`}
            aria-hidden="true"
          >
            <span
              className={`font-sans text-[28px] font-medium ${domainColor ? domainColor.text : 'text-text-secondary'}`}
            >
              {contributor.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="mt-[var(--spacing-sm)] text-center font-sans text-[20px] leading-[1.3] font-semibold text-text-primary">
        {contributor.name}
      </h3>

      {/* Domain Badge */}
      {contributor.domain && domainColor && (
        <div className="mt-[var(--spacing-xs)] flex justify-center">
          <span
            className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
          >
            {contributor.domain}
          </span>
        </div>
      )}

      {/* Bio */}
      {contributor.bio && (
        <p className="mt-[var(--spacing-sm)] line-clamp-3 text-center font-sans text-[15px] leading-[1.5] font-normal text-text-secondary">
          {contributor.bio}
        </p>
      )}
    </Link>
  );
}
