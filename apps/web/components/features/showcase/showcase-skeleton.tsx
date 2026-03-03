import { HeroSkeleton } from './hero-section';
import { FoundingCircleSkeleton } from './founding-circle';

export function ShowcaseSkeleton() {
  return (
    <div role="status" aria-label="Loading showcase page">
      <HeroSkeleton />
      <FoundingCircleSkeleton />
    </div>
  );
}
