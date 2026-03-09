'use client';

import type { EditorialFeedbackDto, EditorProfileDto } from '@edin/shared';
import { InlineCommentCard } from './inline-comment';

interface RevisionSidebarProps {
  feedback: EditorialFeedbackDto;
  editorProfile: EditorProfileDto | null;
}

export function RevisionSidebar({ feedback, editorProfile }: RevisionSidebarProps) {
  const feedbackDate = new Date(feedback.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-[var(--spacing-lg)]">
      {/* Editor info */}
      {editorProfile && (
        <div className="flex items-center gap-[var(--spacing-md)]">
          {editorProfile.profileImageUrl ? (
            <img
              src={editorProfile.profileImageUrl}
              alt={editorProfile.displayName}
              className="h-[32px] w-[32px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-surface-sunken font-sans text-[14px] font-medium text-brand-secondary">
              {editorProfile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-sans text-[14px] font-medium text-brand-primary">
              {editorProfile.displayName}
            </p>
            <p className="font-sans text-[12px] text-brand-secondary">Editor</p>
          </div>
        </div>
      )}

      {/* Overall assessment */}
      <div>
        <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-secondary">
          Overall Assessment
        </h3>
        <p className="font-serif text-[15px] leading-[1.6] text-brand-primary">
          {feedback.overallAssessment}
        </p>
        <span className="mt-[var(--spacing-xs)] block font-sans text-[11px] text-brand-secondary">
          {feedbackDate}
        </span>
      </div>

      {/* Revision requests */}
      {feedback.revisionRequests.length > 0 && (
        <div>
          <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-secondary">
            Revision Requests
          </h3>
          <ol className="flex flex-col gap-[var(--spacing-sm)]">
            {feedback.revisionRequests.map((request, index) => (
              <li
                key={request.id}
                className="flex gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]"
              >
                <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-sans text-[11px] font-medium text-brand-secondary">
                  {index + 1}
                </span>
                <p className="font-sans text-[14px] leading-[1.5] text-brand-primary">
                  {request.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Inline comments summary */}
      {feedback.inlineComments.length > 0 && (
        <div>
          <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-secondary">
            Inline Comments ({feedback.inlineComments.length})
          </h3>
          <div className="flex flex-col gap-[var(--spacing-sm)]">
            {feedback.inlineComments.map((comment, index) => (
              <InlineCommentCard key={comment.id} comment={comment} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
