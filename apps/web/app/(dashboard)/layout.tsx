'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { ToastProvider } from '../../components/ui/toast';

const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/contributions', label: 'Contributions' },
  { href: '/dashboard/working-groups', label: 'Working Groups' },
  { href: '/dashboard/profile', label: 'Profile' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-base lg:flex">
        <aside className="border-b border-surface-border bg-brand-primary text-surface-raised lg:min-h-screen lg:w-[240px] lg:border-b-0 lg:border-r">
          <div className="px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
            <p className="font-serif text-[24px] font-bold">Edin</p>
            <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-surface-raised/70">
              Contributor Dashboard
            </p>
          </div>
          <nav
            className="px-[var(--spacing-md)] pb-[var(--spacing-xl)]"
            aria-label="Dashboard navigation"
          >
            <ul className="flex flex-col gap-[var(--spacing-xs)]">
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/dashboard'
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
    </ToastProvider>
  );
}
