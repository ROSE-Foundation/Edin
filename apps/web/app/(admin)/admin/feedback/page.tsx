import type { Metadata } from 'next';
import { FeedbackMonitoringDashboard } from '../../../../components/features/feedback/admin/feedback-monitoring-dashboard';
import { ToastProvider } from '../../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Feedback Monitoring — Edin Admin',
    description: 'Monitor peer review completion and turnaround times.',
  };
}

export default function FeedbackMonitoringPage() {
  return (
    <ToastProvider>
      <main>
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <h1 className="font-sans text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.2] text-brand-primary">
            Feedback Monitoring
          </h1>
          <p className="mt-[var(--spacing-xs)] font-sans text-[15px] text-brand-secondary">
            Track peer review completion and turnaround times
          </p>
          <div className="mt-[var(--spacing-xl)]">
            <FeedbackMonitoringDashboard />
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
