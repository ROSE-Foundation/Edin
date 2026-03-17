import type { PublicContributorProfile } from '@edin/shared';
import { ContributorRosterCard } from './contributor-roster-card';

interface ContributorRosterGridProps {
  contributors: PublicContributorProfile[];
  isFiltered: boolean;
}

export function ContributorRosterGrid({ contributors, isFiltered }: ContributorRosterGridProps) {
  if (contributors.length === 0) {
    return (
      <div className="py-[var(--spacing-3xl)] text-center">
        <p className="font-sans text-[15px] leading-[1.5] text-text-secondary">
          {isFiltered
            ? 'No contributors found matching your criteria.'
            : 'The community is growing. Check back soon.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
      {contributors.map((contributor) => (
        <ContributorRosterCard key={contributor.id} contributor={contributor} />
      ))}
    </div>
  );
}
