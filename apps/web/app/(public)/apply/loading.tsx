import { AdmissionSkeleton } from '../../../components/features/admission/admission-skeleton';

export default function ApplyLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <AdmissionSkeleton />
    </main>
  );
}
