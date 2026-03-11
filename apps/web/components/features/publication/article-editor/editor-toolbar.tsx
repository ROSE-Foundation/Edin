'use client';

import type { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButton {
  label: string;
  icon: string;
  action: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

const TOOLBAR_GROUPS: ToolbarButton[][] = [
  // Text formatting
  [
    {
      label: 'Bold',
      icon: 'B',
      action: (e) => e.chain().focus().toggleBold().run(),
      isActive: (e) => e.isActive('bold'),
    },
    {
      label: 'Italic',
      icon: 'I',
      action: (e) => e.chain().focus().toggleItalic().run(),
      isActive: (e) => e.isActive('italic'),
    },
    {
      label: 'Strikethrough',
      icon: 'S',
      action: (e) => e.chain().focus().toggleStrike().run(),
      isActive: (e) => e.isActive('strike'),
    },
    {
      label: 'Inline code',
      icon: '<>',
      action: (e) => e.chain().focus().toggleCode().run(),
      isActive: (e) => e.isActive('code'),
    },
  ],
  // Headings
  [
    {
      label: 'Heading 2',
      icon: 'H2',
      action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (e) => e.isActive('heading', { level: 2 }),
    },
    {
      label: 'Heading 3',
      icon: 'H3',
      action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (e) => e.isActive('heading', { level: 3 }),
    },
    {
      label: 'Heading 4',
      icon: 'H4',
      action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
      isActive: (e) => e.isActive('heading', { level: 4 }),
    },
  ],
  // Block elements
  [
    {
      label: 'Bullet list',
      icon: '•',
      action: (e) => e.chain().focus().toggleBulletList().run(),
      isActive: (e) => e.isActive('bulletList'),
    },
    {
      label: 'Numbered list',
      icon: '1.',
      action: (e) => e.chain().focus().toggleOrderedList().run(),
      isActive: (e) => e.isActive('orderedList'),
    },
    {
      label: 'Blockquote',
      icon: '"',
      action: (e) => e.chain().focus().toggleBlockquote().run(),
      isActive: (e) => e.isActive('blockquote'),
    },
    {
      label: 'Code block',
      icon: '{ }',
      action: (e) => e.chain().focus().toggleCodeBlock().run(),
      isActive: (e) => e.isActive('codeBlock'),
    },
    {
      label: 'Divider',
      icon: '—',
      action: (e) => e.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
    },
  ],
  // Link
  [
    {
      label: 'Link',
      icon: '🔗',
      action: (e) => {
        if (e.isActive('link')) {
          e.chain().focus().unsetLink().run();
          return;
        }
        const url = window.prompt('URL:');
        if (url && /^https?:\/\//i.test(url.trim())) {
          e.chain().focus().setLink({ href: url.trim() }).run();
        }
      },
      isActive: (e) => e.isActive('link'),
    },
  ],
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-[var(--spacing-xs)] border-b border-surface-border pb-[var(--spacing-sm)]"
      role="toolbar"
      aria-label="Text formatting"
    >
      {TOOLBAR_GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-[2px]">
          {group.map((btn) => {
            const active = btn.isActive(editor);
            return (
              <button
                key={btn.label}
                type="button"
                onClick={() => btn.action(editor)}
                title={btn.label}
                aria-label={btn.label}
                aria-pressed={active}
                className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-[var(--radius-sm)] px-[6px] font-sans text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-brand-accent/15 text-brand-accent'
                    : 'text-brand-secondary hover:bg-surface-sunken hover:text-brand-primary'
                }`}
              >
                {btn.icon}
              </button>
            );
          })}
          {gi < TOOLBAR_GROUPS.length - 1 && (
            <div className="mx-[var(--spacing-xs)] h-[20px] w-px bg-surface-border" />
          )}
        </div>
      ))}
    </div>
  );
}
