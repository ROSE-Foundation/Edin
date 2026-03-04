import type { Metadata } from 'next';
import { ApplicationForm } from '../../../components/features/admission/application-form';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Apply to Edin — Contribute Your Expertise',
    description:
      'Join the Edin contributor community. Submit your application with a domain-specific micro-task to demonstrate your expertise in Technology, Fintech, Impact, or Governance.',
    openGraph: {
      title: 'Apply to Edin — Contribute Your Expertise',
      description:
        'Join the Edin contributor community. Submit your application with a domain-specific micro-task to demonstrate your expertise.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Apply to Edin — Contribute Your Expertise',
      description:
        'Join the Edin contributor community. Submit your application with a domain-specific micro-task to demonstrate your expertise.',
    },
  };
}

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <section
        className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
        aria-label="Application introduction"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
            Join the Edin Community
          </h1>
          <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-brand-secondary">
            We value expertise and thoughtful contribution. Complete the form below and show us what
            you can do through a brief, domain-specific task.
          </p>
        </div>
      </section>
      <ApplicationForm />
    </main>
  );
}
