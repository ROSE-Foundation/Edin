import type { Metadata } from 'next';
import { OnboardingStatusList } from '../../../components/features/admission/admin/onboarding-status-list';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Onboarding Status | Edin Admin',
    description: 'Monitor contributor onboarding progress and 72-hour ignition tracking.',
  };
}

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <OnboardingStatusList />
      </div>
    </main>
  );
}
