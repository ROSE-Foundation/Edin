import { RewardsSkeleton } from '../../../components/features/rewards/rewards-skeleton';

export default function RewardsLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RewardsSkeleton />
    </main>
  );
}
