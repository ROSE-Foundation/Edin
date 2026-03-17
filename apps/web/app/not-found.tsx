export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-base">
      <h1 className="font-serif text-[32px] font-bold text-text-primary mb-[var(--spacing-md)]">
        404
      </h1>
      <p className="font-sans text-[15px] text-text-secondary">
        The page you are looking for does not exist.
      </p>
    </main>
  );
}
