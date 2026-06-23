'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SetPasswordFormProps {
  token: string | null;
  className?: string;
}

export function SetPasswordForm({ token, className }: SetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Remove the one-time token from the visible URL so it doesn't leak via
  // browser history or the Referer header. The value is already held in props.
  useEffect(() => {
    if (token && typeof window !== 'undefined' && window.location.search.includes('token=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [token]);

  if (!token) {
    return (
      <div
        role="alert"
        className={`rounded-md border border-accent-danger/40 bg-accent-danger/5 px-4 py-3 font-sans text-[13px] leading-relaxed text-accent-danger ${className ?? ''}`}
      >
        This password setup link is invalid or incomplete. Please use the link from your invitation
        email.
      </div>
    );
  }

  if (done) {
    return (
      <div className={`font-sans text-[14px] leading-relaxed text-text-secondary ${className ?? ''}`}>
        Your password has been set. Redirecting you to{' '}
        <Link href="/sign-in" className="text-accent-primary underline">
          sign in
        </Link>
        …
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        setError('This password setup link is invalid or has expired.');
        setSubmitting(false);
        return;
      }

      setDone(true);
      setTimeout(() => router.push('/sign-in'), 1500);
    } catch {
      setError('Something went wrong. Please try again.');
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
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-surface-subtle bg-surface-base px-3 py-2 font-sans text-[14px] text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 font-sans text-[13px] font-medium text-text-secondary">
        Confirm password
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={12}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-md border border-surface-subtle bg-surface-base px-3 py-2 font-sans text-[14px] text-text-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none"
        />
      </label>

      <p className="font-sans text-[12px] text-text-tertiary">Minimum 12 characters.</p>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex items-center justify-center rounded-md bg-accent-primary px-4 py-3 font-sans text-[14px] font-medium text-text-primary transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Setting password…' : 'Set password'}
      </button>
    </form>
  );
}
