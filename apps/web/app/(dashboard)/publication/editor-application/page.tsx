'use client';

import Link from 'next/link';
import {
  useEditorEligibility,
  useSubmitEditorApplication,
} from '../../../../hooks/use-editor-eligibility';
import { EligibilityCard } from '../../../../components/features/publication/editor-eligibility/eligibility-card';
import { useToast } from '../../../../components/ui/toast';

export default function EditorApplicationPage() {
  const { eligibility, isLoading, error } = useEditorEligibility();
  const submitApplication = useSubmitEditorApplication();
  const { toast } = useToast();

  function handleApply(domain: string, statement: string) {
    submitApplication.mutate(
      { domain, applicationStatement: statement },
      {
        onSuccess: () => {
          toast({ title: 'Application submitted successfully' });
        },
        onError: (err) => {
          toast({ title: err.message || 'Failed to submit application', variant: 'error' });
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[2rem] font-bold text-brand-primary">
            Editor Application
          </h1>
          <p className="mt-[var(--spacing-xs)] font-sans text-[15px] text-brand-secondary">
            Apply to become an editor and help shape the quality of published content.
          </p>
        </div>
        <Link
          href="/dashboard/publication"
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
        >
          Back
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
            />
          ))}
        </div>
      ) : error ? (
        <p className="font-sans text-[15px] text-semantic-error">
          Failed to load eligibility data. Please try again.
        </p>
      ) : (
        <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
          {eligibility.map((check) => (
            <EligibilityCard
              key={check.domain}
              check={check}
              onApply={handleApply}
              isSubmitting={submitApplication.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
