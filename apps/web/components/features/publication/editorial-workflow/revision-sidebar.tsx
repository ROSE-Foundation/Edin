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
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-surface-sunken font-sans text-[14px] font-medium text-text-secondary">
              {editorProfile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-sans text-[14px] font-medium text-text-primary">
              {editorProfile.displayName}
            </p>
            <p className="font-sans text-[12px] text-text-secondary">Editor</p>
          </div>
        </div>
      )}

      {/* Overall assessment */}
      <div>
        <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-text-secondary">
          Overall Assessment
        </h3>
        <p className="font-serif text-[15px] leading-[1.6] text-text-primary">
          {feedback.overallAssessment}
        </p>
        <span className="mt-[var(--spacing-xs)] block font-sans text-[11px] text-text-secondary">
          {feedbackDate}
        </span>
      </div>

      {/* Revision requests */}
      {feedback.revisionRequests.length > 0 && (
        <div>
          <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-text-secondary">
            Revision Requests
          </h3>
          <ol className="flex flex-col gap-[var(--spacing-sm)]">
            {feedback.revisionRequests.map((request, index) => (
              <li
                key={request.id}
                className="flex gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]"
              >
                <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-sans text-[11px] font-medium text-text-secondary">
                  {index + 1}
                </span>
                <p className="font-sans text-[14px] leading-[1.5] text-text-primary">
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
          <h3 className="mb-[var(--spacing-sm)] font-sans text-[13px] font-medium text-text-secondary">
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
