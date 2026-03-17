'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-base">
      <h1 className="font-serif text-[32px] font-bold text-text-primary mb-[var(--spacing-md)]">
        Something went wrong
      </h1>
      <p className="font-sans text-[15px] text-text-secondary mb-[var(--spacing-lg)]">
        An unexpected error occurred.
      </p>
      <button
        onClick={reset}
        className="px-[var(--spacing-lg)] py-[var(--spacing-sm)] bg-accent-primary text-surface-raised font-sans text-[15px] font-medium rounded-[var(--radius-md)]"
      >
        Try Again
      </button>
    </main>
  );
}
