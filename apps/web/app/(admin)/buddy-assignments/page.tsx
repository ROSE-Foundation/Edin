import type { Metadata } from 'next';
import { BuddyAssignmentList } from '../../../components/features/admission/admin/buddy-assignment-list';
import { ToastProvider } from '../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Buddy Assignments | Edin Admin',
    description: 'Manage buddy assignments for new contributors.',
  };
}

export default function BuddyAssignmentsPage() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <BuddyAssignmentList />
        </div>
      </main>
    </ToastProvider>
  );
}
