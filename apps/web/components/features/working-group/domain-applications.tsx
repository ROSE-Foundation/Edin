'use client';

import Link from 'next/link';

interface Application {
  id: string;
  applicantName: string;
  domain: string;
  createdAt: string;
}

interface DomainApplicationsProps {
  applications: Application[];
  isPending: boolean;
}

export function DomainApplications({ applications, isPending }: DomainApplicationsProps) {
  if (isPending) {
    return (
      <div className="space-y-[var(--spacing-sm)]">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]"
          >
            <div className="skeleton h-[16px] w-[180px]" />
            <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-[120px]" />
          </div>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <p className="font-serif text-[14px] text-text-secondary">
        No pending applications for your domain.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-xs)]" role="list" aria-label="Pending applications">
      {applications.map((app) => (
        <div
          key={app.id}
          role="listitem"
          className="flex items-center justify-between rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]"
        >
          <div>
            <p className="font-sans text-[14px] font-medium text-text-primary">
              {app.applicantName}
            </p>
            <p className="font-sans text-[12px] text-text-secondary">
              {app.domain} &middot; {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href={`/admin/admission`}
            className="inline-flex min-h-[36px] items-center rounded-[8px] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[13px] font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-sunken"
          >
            Review
          </Link>
        </div>
      ))}
    </div>
  );
}
