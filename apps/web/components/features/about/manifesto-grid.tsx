import type { DomainManifesto } from '@edin/shared';
import { ManifestoSection } from './manifesto-section';

interface ManifestoGridProps {
  manifestos: DomainManifesto[];
}

export function ManifestoGrid({ manifestos }: ManifestoGridProps) {
  return (
    <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <div className="flex flex-col gap-[var(--spacing-2xl)]">
        {manifestos.map((manifesto) => (
          <ManifestoSection key={manifesto.domain} manifesto={manifesto} />
        ))}
      </div>
    </div>
  );
}
