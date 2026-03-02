'use client';

import { useAuth } from '../../../hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
          Welcome to Edin
        </h1>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.5] text-brand-secondary">
          {user ? `Signed in as ${user.name}` : 'Loading your profile...'}
        </p>
      </div>
    </main>
  );
}
