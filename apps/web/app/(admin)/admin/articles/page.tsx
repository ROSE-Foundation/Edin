import type { Metadata } from 'next';
import { ArticlesList } from '../../../../components/features/admin/articles/articles-list';
import { ToastProvider } from '../../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Articles — Edin Admin',
    description:
      'Overview of every article in the editorial workflow with admin override controls.',
  };
}

export default function AdminArticlesPage() {
  return (
    <ToastProvider>
      <main>
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <h1 className="font-sans text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.2] text-text-primary">
            Articles
          </h1>
          <p className="mt-[var(--spacing-xs)] font-sans text-[15px] text-text-secondary">
            Every article in the editorial workflow, who must act next, and admin controls to force
            the next transition.
          </p>
          <div className="mt-[var(--spacing-xl)]">
            <ArticlesList />
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
