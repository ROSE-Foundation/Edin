'use client';

import { useState } from 'react';
import type { InlineCommentDto } from '@edin/shared';

interface InlineCommentHighlightProps {
  comment: InlineCommentDto;
  domainColor?: string;
  isMuted?: boolean;
}

export function InlineCommentHighlight({
  comment,
  domainColor,
  isMuted,
}: InlineCommentHighlightProps) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = domainColor ?? '#C4956A';

  const formattedDate = new Date(comment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="group relative inline cursor-pointer transition-transform"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      aria-label={`Inline comment: ${comment.content}`}
    >
      <span
        className="rounded-[2px] px-[1px] transition-shadow group-hover:shadow-sm"
        style={{
          backgroundColor: '#F5F1EB',
          borderLeft: `2px solid ${borderColor}`,
          opacity: isMuted ? 0.6 : 1,
        }}
      >
        {/* The highlighted text content will be overlaid by the parent */}
      </span>

      {expanded && (
        <div
          className="absolute left-0 top-full z-10 mt-[var(--spacing-xs)] w-[280px] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)] shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-sans text-[14px] leading-[1.5] text-text-primary">{comment.content}</p>
          <div className="mt-[var(--spacing-sm)] flex items-center justify-between">
            <span className="font-sans text-[11px] text-text-secondary">{formattedDate}</span>
            {comment.resolved && (
              <span className="font-sans text-[11px] text-semantic-success">Resolved</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone comment card for display in sidebars
interface InlineCommentCardProps {
  comment: InlineCommentDto;
  index: number;
}

export function InlineCommentCard({ comment, index }: InlineCommentCardProps) {
  const formattedDate = new Date(comment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
      <div className="mb-[var(--spacing-xs)] flex items-center justify-between">
        <span className="font-sans text-[12px] font-medium text-text-secondary">
          Comment #{index + 1}
        </span>
        <span className="font-sans text-[11px] text-text-secondary">{formattedDate}</span>
      </div>
      <p className="font-sans text-[14px] leading-[1.5] text-text-primary">{comment.content}</p>
      <div className="mt-[var(--spacing-xs)] font-sans text-[11px] text-text-secondary">
        Position: {comment.highlightStart}-{comment.highlightEnd}
      </div>
    </div>
  );
}
