import Link from 'next/link';
import { IntegrationHealthPanel } from '../../../../../components/features/sprint-dashboard/integration-health-panel';
import { ZenhubAlertsList } from '../../../../../components/features/sprint-dashboard/zenhub-alerts-list';
import { AlertConfigPanel } from '../../../../../components/features/sprint-dashboard/alert-config-panel';
import { SyncLogTable } from '../../../../../components/features/sprint-dashboard/sync-log-table';
import { SyncConflictsTable } from '../../../../../components/features/sprint-dashboard/sync-conflicts-table';

export default function MonitoringPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)]">
        <Link href="/admin/sprints" className="text-sm text-accent-primary hover:underline">
          &larr; Sprint Dashboard
        </Link>
        <h1 className="mt-[var(--spacing-sm)] font-serif text-[28px] font-bold text-text-primary">
          Integration Monitoring
        </h1>
        <p className="mt-[var(--spacing-xs)] text-sm text-text-secondary">
          Real-time health status, alerts, sync logs, and conflict viewer for the Zenhub
          integration.
        </p>
      </div>

      <div className="mb-[var(--spacing-lg)]">
        <IntegrationHealthPanel />
      </div>

      <div className="mb-[var(--spacing-lg)]">
        <ZenhubAlertsList />
      </div>

      <div className="mb-[var(--spacing-lg)] rounded-lg border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
        <h2 className="mb-[var(--spacing-md)] font-serif text-lg font-semibold text-text-primary">
          Alert Configuration
        </h2>
        <AlertConfigPanel />
      </div>

      <div className="mb-[var(--spacing-lg)] rounded-lg border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
        <h2 className="mb-[var(--spacing-md)] font-serif text-lg font-semibold text-text-primary">
          Sync Logs
        </h2>
        <SyncLogTable />
      </div>

      <div className="rounded-lg border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
        <h2 className="mb-[var(--spacing-md)] font-serif text-lg font-semibold text-text-primary">
          Sync Conflicts
        </h2>
        <SyncConflictsTable />
      </div>
    </main>
  );
}
