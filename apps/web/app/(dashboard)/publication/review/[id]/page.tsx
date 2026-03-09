'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from '../../../../../components/features/publication/article-editor/tiptap-editor';
import { EditorialFeedbackForm } from '../../../../../components/features/publication/editorial-workflow/editorial-feedback';
import { ArticleLifecycle } from '../../../../../components/features/publication/editorial-workflow/article-lifecycle';
import { VersionSelector } from '../../../../../components/features/publication/editorial-workflow/version-selector';
import { DOMAIN_COLORS } from '../../../../../components/features/publication/domain-colors';
import {
  useEditorialView,
  useSubmitFeedback,
  useArticleVersion,
} from '../../../../../hooks/use-article';
import type { EditorialFeedbackInput } from '@edin/shared';

export default function EditorialReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { editorialView, isLoading, error } = useEditorialView(id);
  const submitFeedback = useSubmitFeedback();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const { versionData } = useArticleVersion(id, selectedVersion);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="grid grid-cols-1 gap-[var(--spacing-xl)] lg:grid-cols-[1fr_380px]">
          <div className="space-y-[var(--spacing-lg)]">
            <div className="h-[48px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
            <div className="h-[600px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          </div>
          <div className="h-[400px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>
      </div>
    );
  }

  if (error || !editorialView) {
    return (
      <div className="mx-auto max-w-[960px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="font-sans text-[15px] text-semantic-error">
          {error?.message ?? 'Failed to load editorial view'}
        </p>
        <button
          onClick={() => router.push('/dashboard/publication')}
          className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
        >
          Back to Publication
        </button>
      </div>
    );
  }

  const { article, feedbackHistory, versions } = editorialView;
  const domainColor = DOMAIN_COLORS[article.domain] ?? '#6B7B8D';
  const displayBody =
    selectedVersion !== null && versionData?.body ? versionData.body : article.body;
  const canSubmitFeedback =
    article.status === 'EDITORIAL_REVIEW' || article.status === 'REVISION_REQUESTED';

  const handleSubmitFeedback = async (data: EditorialFeedbackInput) => {
    setSubmitError(null);
    try {
      await submitFeedback.mutateAsync({ articleId: id, data });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-[var(--spacing-lg)] py-[var(--spacing-4xl)]">
        <h2 className="font-serif text-[24px] font-bold text-brand-primary">Feedback Submitted</h2>
        <p className="max-w-[480px] text-center font-sans text-[15px] text-brand-secondary">
          Your editorial feedback has been recorded. The author will be notified.
        </p>
        <button
          onClick={() => router.push('/dashboard/publication')}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
        >
          Back to Publication
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      {/* Header */}
      <div className="mb-[var(--spacing-xl)]">
        <div className="mb-[var(--spacing-md)] flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/publication')}
            className="font-sans text-[14px] text-brand-secondary transition-colors hover:text-brand-primary"
          >
            &larr; Back to Publication
          </button>
          <VersionSelector
            versions={versions}
            currentVersion={article.version}
            selectedVersion={selectedVersion}
            onSelectVersion={setSelectedVersion}
          />
        </div>
        <h1 className="font-serif text-[2rem] font-bold text-brand-primary">{article.title}</h1>
        <div className="mt-[var(--spacing-sm)] flex items-center gap-[var(--spacing-md)]">
          <span
            className="rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-surface-raised"
            style={{ backgroundColor: domainColor }}
          >
            {article.domain}
          </span>
          <ArticleLifecycle currentStatus={article.status} domain={article.domain} />
        </div>
        {article.abstract && (
          <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.5] text-brand-secondary">
            {article.abstract}
          </p>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-[var(--spacing-xl)] lg:grid-cols-[1fr_380px]">
        {/* Left: Article content */}
        <div
          className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)]"
          style={{ borderTop: `3px solid ${domainColor}` }}
        >
          <TiptapEditor content={displayBody} onChange={() => {}} placeholder="" editable={false} />
        </div>

        {/* Right: Editorial panel */}
        <div className="lg:sticky lg:top-[var(--spacing-xl)] lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
            <h2 className="mb-[var(--spacing-lg)] font-sans text-[16px] font-semibold text-brand-primary">
              Editorial Feedback
            </h2>

            {submitError && (
              <p className="mb-[var(--spacing-md)] font-sans text-[14px] text-semantic-error">
                {submitError}
              </p>
            )}
            {canSubmitFeedback ? (
              <EditorialFeedbackForm
                onSubmit={handleSubmitFeedback}
                isSubmitting={submitFeedback.isPending}
              />
            ) : (
              <p className="font-sans text-[14px] text-brand-secondary">
                This article is currently in &quot;{article.status}&quot; status and cannot receive
                feedback.
              </p>
            )}
          </div>

          {/* Feedback history */}
          {feedbackHistory.length > 0 && (
            <div className="mt-[var(--spacing-lg)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
              <h3 className="mb-[var(--spacing-md)] font-sans text-[14px] font-semibold text-brand-primary">
                Previous Feedback ({feedbackHistory.length})
              </h3>
              <div className="flex flex-col gap-[var(--spacing-md)]">
                {feedbackHistory.map((fb) => {
                  const date = new Date(fb.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  return (
                    <div
                      key={fb.id}
                      className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]"
                    >
                      <div className="mb-[var(--spacing-xs)] flex items-center justify-between">
                        <span className="font-sans text-[13px] font-medium text-brand-primary">
                          {fb.decision === 'APPROVE'
                            ? 'Approved'
                            : fb.decision === 'REQUEST_REVISIONS'
                              ? 'Revisions Requested'
                              : 'Rejected'}
                        </span>
                        <span className="font-sans text-[11px] text-brand-secondary">
                          v{fb.articleVersion} &middot; {date}
                        </span>
                      </div>
                      <p className="font-sans text-[13px] leading-[1.5] text-brand-secondary">
                        {fb.overallAssessment.length > 150
                          ? `${fb.overallAssessment.slice(0, 150)}...`
                          : fb.overallAssessment}
                      </p>
                      {fb.inlineComments.length > 0 && (
                        <div className="mt-[var(--spacing-sm)]">
                          <span className="font-sans text-[11px] text-brand-secondary">
                            {fb.inlineComments.length} inline comment
                            {fb.inlineComments.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
