import type { Metadata } from 'next';
import { ModerationDashboard } from '../../../../../components/features/publication/admin/moderation-dashboard';
import { ToastProvider } from '../../../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Content Moderation — Edin Admin',
    description: 'Review flagged articles and manage content moderation.',
  };
}

export default function ModerationPage() {
  return (
    <ToastProvider>
      <main>
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <h1 className="font-sans text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.2] text-brand-primary">
            Content Moderation
          </h1>
          <p className="mt-[var(--spacing-xs)] font-sans text-[15px] text-brand-secondary">
            Review flagged articles for plagiarism and AI-generated content
          </p>
          <div className="mt-[var(--spacing-xl)]">
            <ModerationDashboard />
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
