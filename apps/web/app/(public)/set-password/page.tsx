import type { Metadata } from 'next';
import { SetPasswordForm } from './set-password-form';

export const metadata: Metadata = {
  title: 'Set your password — Edin',
  description: 'Create a password for your Edin account.',
};

interface SetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[520px] flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-lg border border-surface-subtle bg-surface-raised p-8 shadow-sm">
        <h1 className="font-serif text-[28px] font-bold text-text-primary">Set your password</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-secondary">
          Create a password to access your Edin account. Your email address is your identifier.
        </p>

        <SetPasswordForm token={token ?? null} className="mt-8" />
      </div>
    </main>
  );
}
