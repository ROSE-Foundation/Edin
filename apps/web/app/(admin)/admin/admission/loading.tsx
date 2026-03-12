import { AdmissionQueueSkeleton } from '../../../../components/features/admission/admin/admission-queue-skeleton';

export default function Loading() {
  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <AdmissionQueueSkeleton />
      </div>
    </main>
  );
}
