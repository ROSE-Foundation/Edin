'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';

interface SignInFormProps {
  className?: string;
}

export function SignInForm({ className }: SignInFormProps) {
  const router = useRouter();
  const { loginWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className ?? ''}`} noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-accent-danger/40 bg-accent-danger/5 px-4 py-3 font-sans text-[13px] leading-relaxed text-accent-danger"
        >
          {error}
        </div>
      ) : null}

      <label className="flex flex-col gap-1 font-sans text-[13px] font-medium text-text-secondary">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-surface-subtle bg-surface-base px-3 py-2 font-sans text-[14px] text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 font-sans text-[13px] font-medium text-text-secondary">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-surface-subtle bg-surface-base px-3 py-2 font-sans text-[14px] text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex items-center justify-center rounded-md bg-accent-primary px-4 py-3 font-sans text-[14px] font-medium text-text-primary transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Signing in…' : 'Sign in with email'}
      </button>
    </form>
  );
}
