'use client';

import { useState } from 'react';

interface AnnouncementFormProps {
  onSubmit: (content: string) => void;
  isPending: boolean;
}

const MAX_LENGTH = 500;

export function AnnouncementForm({ onSubmit, isPending }: AnnouncementFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && content.length <= MAX_LENGTH) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--spacing-sm)]">
      <label
        htmlFor="announcement-content"
        className="block font-sans text-[14px] font-medium text-text-primary"
      >
        New Announcement
      </label>
      <div className="relative">
        <textarea
          id="announcement-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={3}
          className="w-full resize-none rounded-[12px] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)] font-sans text-[14px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent-primary focus:outline-none"
          placeholder="Write an announcement for your domain members..."
          aria-describedby="char-count"
        />
        <span
          id="char-count"
          className="absolute right-[var(--spacing-sm)] bottom-[var(--spacing-sm)] font-sans text-[12px] text-text-secondary"
        >
          {content.length} / {MAX_LENGTH}
        </span>
      </div>
      <button
        type="submit"
        disabled={isPending || !content.trim() || content.length > MAX_LENGTH}
        className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] font-sans text-[14px] font-medium text-white transition-colors duration-[var(--transition-fast)] hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Posting...' : 'Post Announcement'}
      </button>
    </form>
  );
}
