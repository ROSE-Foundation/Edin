import { describe, it, expect, vi } from 'vitest';
import { deriveWorkflow, AdminArticlesService } from './articles.service.js';
import type { ArticleStatus } from '@edin/shared';

const author = { id: 'author-1', name: 'Author One' };
const editor = { id: 'editor-1', name: 'Editor One' };

describe('deriveWorkflow', () => {
  it('routes a DRAFT to its author with SUBMIT available', () => {
    const { nextActor, availableActions } = deriveWorkflow('DRAFT', null, author, null);
    expect(nextActor).toEqual({ role: 'AUTHOR', id: author.id, name: author.name });
    expect(availableActions).toEqual(['SUBMIT']);
  });

  it('routes a flagged SUBMITTED article to the admin with moderation actions', () => {
    const { nextActor, availableActions } = deriveWorkflow(
      'SUBMITTED',
      { status: 'FLAGGED', isFlagged: true },
      author,
      null,
    );
    expect(nextActor.role).toBe('ADMIN');
    expect(availableActions).toEqual([
      'MODERATION_DISMISS',
      'MODERATION_REQUEST_CORRECTIONS',
      'MODERATION_REJECT',
    ]);
  });

  it('routes a clean SUBMITTED article to the system for editor assignment', () => {
    const { nextActor, availableActions } = deriveWorkflow(
      'SUBMITTED',
      { status: 'CLEAN', isFlagged: false },
      author,
      null,
    );
    expect(nextActor.role).toBe('SYSTEM');
    expect(availableActions).toEqual(['ASSIGN_EDITOR']);
  });

  it('withholds ASSIGN_EDITOR while moderation is still PENDING (gate not yet cleared)', () => {
    const { nextActor, availableActions } = deriveWorkflow(
      'SUBMITTED',
      { status: 'PENDING', isFlagged: false },
      author,
      null,
    );
    expect(nextActor.role).toBe('SYSTEM');
    expect(availableActions).toEqual([]);
  });

  it('withholds ASSIGN_EDITOR when no moderation report exists yet', () => {
    const { availableActions } = deriveWorkflow('SUBMITTED', null, author, null);
    expect(availableActions).toEqual([]);
  });

  it('routes EDITORIAL_REVIEW to the assigned editor with the three outcomes', () => {
    const { nextActor, availableActions } = deriveWorkflow(
      'EDITORIAL_REVIEW',
      null,
      author,
      editor,
    );
    expect(nextActor).toEqual({ role: 'EDITOR', id: editor.id, name: editor.name });
    expect(availableActions).toEqual(['APPROVE', 'REQUEST_REVISIONS', 'REJECT']);
  });

  it('routes REVISION_REQUESTED back to the author with RESUBMIT', () => {
    const { nextActor, availableActions } = deriveWorkflow(
      'REVISION_REQUESTED',
      null,
      author,
      editor,
    );
    expect(nextActor.role).toBe('AUTHOR');
    expect(availableActions).toEqual(['RESUBMIT']);
  });

  it('routes APPROVED to the admin for publishing', () => {
    const { nextActor, availableActions } = deriveWorkflow('APPROVED', null, author, editor);
    expect(nextActor.role).toBe('ADMIN');
    expect(availableActions).toEqual(['PUBLISH']);
  });

  it('offers UNPUBLISH on PUBLISHED with no required actor', () => {
    const { nextActor, availableActions } = deriveWorkflow('PUBLISHED', null, author, editor);
    expect(nextActor.role).toBe('NONE');
    expect(availableActions).toEqual(['UNPUBLISH']);
  });

  it('offers no actions on a terminal ARCHIVED article', () => {
    const { nextActor, availableActions } = deriveWorkflow('ARCHIVED', null, author, editor);
    expect(nextActor.role).toBe('NONE');
    expect(availableActions).toEqual([]);
  });
});

describe('AdminArticlesService.forceTransition', () => {
  function buildService(
    articleStatus: ArticleStatus,
    opts: {
      moderationReports?: { status: string; isFlagged: boolean }[];
      updatedStatus?: ArticleStatus;
    } = {},
  ) {
    const row = {
      id: 'article-1',
      title: 'Test Article',
      slug: 'test-article',
      domain: 'Technology',
      status: articleStatus,
      version: 1,
      body: 'x'.repeat(600),
      author,
      editor: null,
      moderationReports: opts.moderationReports ?? [],
      submittedAt: null,
      publishedAt: null,
      updatedAt: new Date('2026-06-15T00:00:00.000Z'),
    };
    const prisma = {
      article: {
        findUnique: vi.fn().mockResolvedValue(row),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...row, status: opts.updatedStatus ?? 'SUBMITTED' }),
      },
    };
    const audit = { log: vi.fn() };
    const articleService = { submitArticle: vi.fn() };
    const editorialService = { publishArticle: vi.fn(), assignEditor: vi.fn() };
    const moderationService = {};

    const service = new AdminArticlesService(
      prisma as never,
      audit as never,
      articleService as never,
      editorialService as never,
      moderationService as never,
    );
    return { service, audit, articleService, editorialService };
  }

  it('rejects an action that is invalid for the current status', async () => {
    const { service, audit, editorialService } = buildService('DRAFT');

    await expect(
      service.forceTransition(
        'article-1',
        'admin-1',
        { action: 'PUBLISH', reason: 'forcing it through' },
        'corr-1',
      ),
    ).rejects.toMatchObject({ errorCode: 'ARTICLE_INVALID_STATUS_TRANSITION' });

    expect(editorialService.publishArticle).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('dispatches a valid action and writes an audit entry', async () => {
    const { service, audit, articleService } = buildService('DRAFT');

    await service.forceTransition(
      'article-1',
      'admin-1',
      { action: 'SUBMIT', reason: 'author is unavailable' },
      'corr-1',
    );

    expect(articleService.submitArticle).toHaveBeenCalledWith('article-1', 'admin-1', 'corr-1', {
      adminOverride: true,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_FORCE_TRANSITION', entityId: 'article-1' }),
    );
  });

  it('records both previous and new state in the audit entry', async () => {
    const { service, audit } = buildService('DRAFT', { updatedStatus: 'SUBMITTED' });

    await service.forceTransition(
      'article-1',
      'admin-1',
      { action: 'SUBMIT', reason: 'author is unavailable' },
      'corr-1',
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        previousState: { status: 'DRAFT' },
        newState: { status: 'SUBMITTED' },
      }),
    );
  });

  it('rejects ASSIGN_EDITOR as a no-op when no editor is available (no false success or audit)', async () => {
    // Moderation cleared so ASSIGN_EDITOR is offered, but assignEditor leaves the
    // article in SUBMITTED (no eligible editor) -> updatedStatus stays SUBMITTED.
    const { service, audit, editorialService } = buildService('SUBMITTED', {
      moderationReports: [{ status: 'CLEAN', isFlagged: false }],
      updatedStatus: 'SUBMITTED',
    });

    await expect(
      service.forceTransition(
        'article-1',
        'admin-1',
        { action: 'ASSIGN_EDITOR', reason: 'manually assigning an editor' },
        'corr-1',
      ),
    ).rejects.toMatchObject({ errorCode: 'ARTICLE_NO_EDITOR_AVAILABLE' });

    expect(editorialService.assignEditor).toHaveBeenCalledWith('article-1', 'corr-1');
    expect(audit.log).not.toHaveBeenCalled();
  });
});
