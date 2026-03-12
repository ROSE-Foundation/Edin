'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/contributors', label: 'Contributors' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/publication/moderation', label: 'Moderation' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/compliance', label: 'Compliance' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-base lg:flex">
      <aside className="shrink-0 border-b border-surface-border bg-brand-primary text-surface-raised lg:min-h-screen lg:w-[240px] lg:border-b-0 lg:border-r">
        <div className="px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
          <Link
            href="/"
            className="flex items-center gap-[var(--spacing-sm)] transition-opacity duration-[var(--transition-fast)] hover:opacity-80"
          >
            <Image
              src="/edin-logo.png"
              alt=""
              width={48}
              height={48}
              className="rounded-full brightness-125"
            />
            <p className="font-serif text-[24px] font-bold">Edin</p>
          </Link>
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-surface-raised/70">
            Administration
          </p>
        </div>
        <nav
          className="px-[var(--spacing-md)] pb-[var(--spacing-xl)]"
          aria-label="Admin navigation"
        >
          <ul className="flex flex-col gap-[var(--spacing-xs)]">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive =
                'exact' in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex min-h-[44px] items-center rounded-[var(--radius-md)] px-[var(--spacing-md)] font-sans text-[15px] transition-colors duration-[var(--transition-fast)] ${
                      isActive
                        ? 'bg-brand-accent-subtle text-brand-primary'
                        : 'text-surface-raised/85 hover:bg-surface-raised/10 hover:text-surface-raised'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
