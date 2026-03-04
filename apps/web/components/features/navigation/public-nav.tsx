'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/articles', label: 'Publication' },
  { href: '/contributors', label: 'Contributors' },
  { href: '/about', label: 'About' },
  { href: '/apply', label: 'Apply' },
];

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-surface-border bg-surface-raised" aria-label="Main navigation">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-[var(--spacing-lg)] py-[var(--spacing-md)]">
        <Link
          href="/"
          className="font-serif text-[20px] font-bold text-brand-primary transition-colors duration-[var(--transition-fast)] hover:text-brand-accent"
        >
          Edin
        </Link>

        <ul className="flex items-center gap-[var(--spacing-lg)]">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`font-sans text-[14px] font-medium transition-colors duration-[var(--transition-fast)] ${
                    isActive ? 'text-brand-accent' : 'text-brand-secondary hover:text-brand-primary'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
