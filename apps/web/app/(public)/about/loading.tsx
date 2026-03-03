import { AboutSkeleton } from '../../../components/features/about/about-skeleton';

export default function AboutLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <AboutSkeleton />
    </main>
  );
}
