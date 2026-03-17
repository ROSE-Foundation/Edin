'use client';

import { use, useState } from 'react';
import { ArticleEditor } from '../../../../../components/features/publication/article-editor/article-editor';
import { TiptapEditor } from '../../../../../components/features/publication/article-editor/tiptap-editor';
import { RevisionSidebar } from '../../../../../components/features/publication/editorial-workflow/revision-sidebar';
import { VersionSelector } from '../../../../../components/features/publication/editorial-workflow/version-selector';
import { ArticleLifecycle } from '../../../../../components/features/publication/editorial-workflow/article-lifecycle';
import {
  useArticle,
  useAuthorRevisionView,
  useArticleVersions,
  useArticleVersion,
  useResubmitArticle,
} from '../../../../../hooks/use-article';
import { useRouter } from 'next/navigation';

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { article, isLoading } = useArticle(id);
  const isRevisionRequested = article?.status === 'REVISION_REQUESTED';
  const { revisionView, isLoading: revisionLoading } = useAuthorRevisionView(
    isRevisionRequested ? id : undefined,
  );
  const { versions } = useArticleVersions(isRevisionRequested ? id : undefined);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const { versionData } = useArticleVersion(id, selectedVersion);
  const resubmitArticle = useResubmitArticle();
  const [resubmitted, setResubmitted] = useState(false);

  if (isLoading || (isRevisionRequested && revisionLoading)) {
    return (
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="space-y-[var(--spacing-lg)]">
          <div className="h-[48px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[32px] w-[200px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[80px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[400px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>
      </div>
    );
  }

  if (resubmitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-[var(--spacing-lg)] py-[var(--spacing-4xl)]">
        <h2 className="font-serif text-[24px] font-bold text-text-primary">Article Resubmitted</h2>
        <p className="max-w-[480px] text-center font-sans text-[15px] text-text-secondary">
          Your revised article has been resubmitted for editorial review. You&apos;ll receive a
          notification when the editor has reviewed your changes.
        </p>
        <button
          onClick={() => router.push('/publication')}
          className="rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-accent-primary/90"
        >
          Back to Publication
        </button>
      </div>
    );
  }

  // Revision mode: show editor + revision sidebar
  if (isRevisionRequested && revisionView) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        {/* Status bar */}
        <div className="mb-[var(--spacing-lg)]">
          <ArticleLifecycle currentStatus={article!.status} domain={article!.domain} />
        </div>

        {/* Version selector */}
        {versions.length > 0 && (
          <div className="mb-[var(--spacing-lg)]">
            <VersionSelector
              versions={versions}
              currentVersion={article!.version}
              selectedVersion={selectedVersion}
              onSelectVersion={setSelectedVersion}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-[var(--spacing-xl)] lg:grid-cols-[1fr_340px]">
          {/* Left: Editor (or read-only version view) */}
          <div>
            {selectedVersion !== null && versionData?.body ? (
              <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-xl)]">
                <p className="mb-[var(--spacing-md)] font-sans text-[13px] text-text-secondary">
                  Viewing version {selectedVersion} (read-only)
                </p>
                <TiptapEditor content={versionData.body} onChange={() => {}} editable={false} />
              </div>
            ) : (
              <ArticleEditor
                initialArticle={article}
                resubmitMode
                onResubmit={async (body) => {
                  await resubmitArticle.mutateAsync({ articleId: id, body });
                  setResubmitted(true);
                }}
                isResubmitting={resubmitArticle.isPending}
              />
            )}
          </div>

          {/* Right: Revision sidebar */}
          <div className="lg:sticky lg:top-[var(--spacing-xl)] lg:self-start">
            <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)]">
              <h2 className="mb-[var(--spacing-lg)] font-sans text-[16px] font-semibold text-text-primary">
                Editorial Feedback
              </h2>
              <RevisionSidebar
                feedback={revisionView.latestFeedback!}
                editorProfile={revisionView.editorProfile}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal edit mode
  return <ArticleEditor initialArticle={article} />;
}
