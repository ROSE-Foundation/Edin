import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publication — Edin Docs',
  description: 'How to write, submit, edit, and publish articles on the Edin platform.',
};

export default function PublicationPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-text-primary">
        Publication
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-text-secondary">
        Edin includes a full publication platform where contributors can write, submit, and publish
        peer-reviewed articles that showcase their expertise.
      </p>

      {/* Writing Articles */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Writing Articles
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Any contributor can write articles on topics related to their domain. Articles transform
          your contributions and expertise into published, peer-reviewed content that is visible to
          the entire community and the public.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-text-primary">
          Creating an Article
        </h3>
        <ol className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)] list-decimal">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Navigate to{' '}
            <strong className="text-text-primary">Dashboard &gt; Publication &gt; New</strong>.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Enter your article title, select your domain, and start writing using the rich text
            editor.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Save your work as a draft at any time — drafts are only visible to you.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            When ready, submit your article for editorial review.
          </li>
        </ol>
      </section>

      {/* Editorial Workflow */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Editorial Workflow
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Every article goes through a structured editorial process before publication:
        </p>
        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-sm)]">
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-text-secondary">
              1
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-text-primary">Draft</span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                — you write and refine your article privately.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-text-secondary">
              2
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-text-primary">
                In Review
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                — an editor from your domain reviews the article.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-text-secondary">
              3
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-text-primary">
                Revision
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                — you address editorial feedback and resubmit.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-text-secondary">
              4
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-text-primary">
                Approved
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                — the editor approves the article for publication.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-accent-primary font-mono text-[12px] font-bold text-surface-raised">
              5
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-text-primary">
                Published
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                — the article is live and visible to everyone.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Becoming an Editor */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Becoming an Editor
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Editors are experienced contributors who review and approve articles in their domain. To
          become an editor, you must meet specific eligibility criteria:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Have a minimum number of published contributions in your domain
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Maintain a consistently high evaluation score
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Submit an editor application from{' '}
            <strong className="text-text-primary">
              Dashboard &gt; Publication &gt; Editor Application
            </strong>
          </li>
        </ul>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-text-secondary">
          Editors receive 20% of the reward generated by articles they review, incentivizing
          thorough and constructive editorial feedback.
        </p>
      </section>

      {/* Content Moderation */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Content Moderation
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          All submitted articles go through automated checks including plagiarism detection. The
          community and administrators can also flag published articles for content that violates
          community standards. Flagged articles are reviewed and may be unpublished if necessary.
        </p>
      </section>

      {/* Article Metrics */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Article Metrics
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Once published, you can track your article&apos;s performance from{' '}
          <strong className="text-text-primary">
            Dashboard &gt; Publication &gt; [Article] &gt; Metrics
          </strong>
          . Metrics include view counts, engagement data, and the reward generated by the article.
        </p>
      </section>
    </article>
  );
}
