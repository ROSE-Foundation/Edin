'use client';

import Image from 'next/image';
import type { BuddyProfile } from '@edin/shared';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Finance: { bg: 'bg-domain-finance', text: 'text-white' },
  Impact: { bg: 'bg-domain-impact', text: 'text-white' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

interface BuddyWelcomeCardProps {
  buddy: BuddyProfile | null;
  isLoading: boolean;
}

export function BuddyWelcomeCard({ buddy, isLoading }: BuddyWelcomeCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-[var(--spacing-md)]">
          <div className="skeleton h-[72px] w-[72px] shrink-0 rounded-full" />
          <div className="flex-1 space-y-[var(--spacing-sm)]">
            <div className="skeleton h-[20px] w-[180px]" />
            <div className="skeleton h-[16px] w-[100px]" />
            <div className="skeleton h-[40px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!buddy) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <h3 className="font-sans text-[15px] font-medium text-brand-primary">Your Buddy</h3>
        <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
          We&apos;re finding the right person to welcome you. Your buddy will appear here soon.
        </p>
      </div>
    );
  }

  const domainColor = buddy.domain ? DOMAIN_COLORS[buddy.domain] : null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <h3 className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
        Your Buddy
      </h3>
      <div className="mt-[var(--spacing-md)] flex items-start gap-[var(--spacing-md)]">
        {buddy.avatarUrl ? (
          <Image
            src={buddy.avatarUrl}
            alt={`${buddy.name}'s photo`}
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-full border border-surface-border object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-sunken">
            <span className="font-sans text-[28px] font-medium text-brand-secondary">
              {buddy.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-serif text-[18px] font-bold text-brand-primary">{buddy.name}</h4>
          {buddy.domain && domainColor && (
            <span
              className={`mt-[var(--spacing-xs)] inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
            >
              {buddy.domain}
            </span>
          )}
          {buddy.bio && (
            <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
              {buddy.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
