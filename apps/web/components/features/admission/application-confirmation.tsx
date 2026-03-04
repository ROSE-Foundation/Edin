'use client';

export function ApplicationConfirmation() {
  return (
    <div
      className="mx-auto max-w-[600px] text-center"
      role="status"
      aria-label="Application submitted"
    >
      <h2 className="font-serif text-[clamp(1.5rem,4vw,2rem)] leading-[1.2] font-bold text-brand-primary">
        Application Received
      </h2>
      <p className="mt-[var(--spacing-lg)] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        We&apos;ll review your application within 48 hours. You will receive an update at the email
        address you provided.
      </p>
      <p className="mt-[var(--spacing-md)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
        In the meantime, feel free to explore our community and learn more about the domains we work
        in.
      </p>
    </div>
  );
}
