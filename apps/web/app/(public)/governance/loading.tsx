import { GovernanceSkeleton } from '../../../components/features/governance/governance-skeleton';

export default function GovernanceLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <GovernanceSkeleton />
    </main>
  );
}
