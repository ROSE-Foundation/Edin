'use client';

import type { PublicContributorProfile } from '@edin/shared';
import { HeroSection } from './hero-section';
import { FoundingCircle } from './founding-circle';
import { useFoundingContributors } from '../../../hooks/use-founding-contributors';

interface ShowcaseContentProps {
  initialContributors: PublicContributorProfile[];
}

export function ShowcaseContent({ initialContributors }: ShowcaseContentProps) {
  const { contributors } = useFoundingContributors(initialContributors);

  return (
    <>
      <HeroSection />
      <FoundingCircle contributors={contributors} />
    </>
  );
}
