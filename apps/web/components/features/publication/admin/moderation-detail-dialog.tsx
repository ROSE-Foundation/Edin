'use client';

import type { FlaggedArticleDto, FlaggedPassage } from '@edin/shared';

interface ModerationDetailDialogProps {
  article: FlaggedArticleDto;
  onClose: () => void;
  onDismiss: (articleId: string) => void;
  onRequestCorrections: (articleId: string) => void;
  onReject: (articleId: string) => void;
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  PLAGIARISM: 'Plagiarism',
  AI_CONTENT: 'AI Content',
  BOTH: 'Plagiarism + AI Content',
};

export function ModerationDetailDialog({
  article,
  onClose,
  onDismiss,
  onRequestCorrections,
  onReject,
}: ModerationDetailDialogProps) {
  const report = article.moderationReport;
  const passages = report.flaggedPassages ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Moderation report details"
    >
      <div className="mx-[var(--spacing-lg)] max-h-[80vh] w-full max-w-[640px] overflow-y-auto rounded-[var(--radius-lg)] bg-surface-base p-[var(--spacing-xl)] shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[20px] font-bold text-text-primary">
              Moderation Report
            </h2>
            <p className="mt-1 font-sans text-[14px] text-text-secondary">{article.articleTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] p-1 text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
          <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
            <div className="rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]">
              <p className="font-sans text-[12px] font-medium uppercase text-text-secondary">
                Plagiarism Score
              </p>
              <p className="mt-1 font-sans text-[24px] font-bold text-text-primary">
                {Math.round(report.plagiarismScore * 100)}%
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]">
              <p className="font-sans text-[12px] font-medium uppercase text-text-secondary">
                AI Content Score
              </p>
              <p className="mt-1 font-sans text-[24px] font-bold text-text-primary">
                {Math.round(report.aiContentScore * 100)}%
              </p>
            </div>
          </div>

          {report.flagType && (
            <div className="rounded-[var(--radius-md)] bg-[#B06B6B]/5 p-[var(--spacing-md)]">
              <p className="font-sans text-[13px] font-medium text-[#B06B6B]">
                Flagged: {FLAG_TYPE_LABELS[report.flagType] ?? report.flagType}
              </p>
            </div>
          )}

          {passages.length > 0 && (
            <div>
              <h3 className="font-sans text-[14px] font-medium text-text-primary">
                Flagged Passages
              </h3>
              <div className="mt-[var(--spacing-sm)] space-y-[var(--spacing-sm)]">
                {passages.map((passage: FlaggedPassage, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-sm)]"
                  >
                    <div className="flex items-center gap-[var(--spacing-xs)]">
                      <span
                        className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-medium ${
                          passage.type === 'PLAGIARISM'
                            ? 'bg-[#B06B6B]/10 text-[#B06B6B]'
                            : 'bg-[#C49A3C]/10 text-[#C49A3C]'
                        }`}
                      >
                        {passage.type === 'PLAGIARISM' ? 'Plagiarism' : 'AI Content'}
                      </span>
                      {passage.source && (
                        <span className="font-sans text-[11px] text-text-secondary">
                          Source: {passage.source}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[13px] italic text-text-secondary">
                      &ldquo;{passage.text.slice(0, 200)}
                      {passage.text.length > 200 ? '...' : ''}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-[var(--spacing-sm)] border-t border-surface-subtle pt-[var(--spacing-md)]">
            <p className="font-sans text-[13px] text-text-secondary">
              Author: {article.authorName} &middot; Domain: {article.domain}
            </p>
          </div>
        </div>

        <div className="mt-[var(--spacing-lg)] flex items-center justify-end gap-[var(--spacing-sm)]">
          <button
            type="button"
            onClick={() => onDismiss(article.articleId)}
            className="rounded-[var(--radius-md)] bg-green-50 px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-green-700 hover:bg-green-100"
          >
            Dismiss Flag
          </button>
          <button
            type="button"
            onClick={() => onRequestCorrections(article.articleId)}
            className="rounded-[var(--radius-md)] bg-[#C49A3C]/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-[#C49A3C] hover:bg-[#C49A3C]/20"
          >
            Request Corrections
          </button>
          <button
            type="button"
            onClick={() => onReject(article.articleId)}
            className="rounded-[var(--radius-md)] bg-red-50 px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-red-700 hover:bg-red-100"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
