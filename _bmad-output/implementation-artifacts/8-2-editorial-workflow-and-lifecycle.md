# Story 8.2: Editorial Workflow & Lifecycle

Status: done

## Story

As an editor,
I want to review assigned articles and provide structured editorial feedback,
so that I can help authors produce their best work through a clear editorial process.

## Acceptance Criteria

### AC1: Automatic Editor Assignment

**Given** a contributor submits an article (status transitions to SUBMITTED)
**When** the `publication.article.submitted` event is processed
**Then** the system assigns an Editor based on: domain expertise match (editor's primary domain matches article domain tag) and editor availability (fewest active assignments) (FR67)
**And** if no eligible editor is available, the article is queued and an admin notification is sent
**And** admins can override the automatic assignment via /admin/publication/assignments
**And** the article status transitions to EDITORIAL_REVIEW
**And** the assigned editor receives a notification

### AC2: Editorial Review Interface

**Given** I am an editor with an assigned article
**When** I navigate to /dashboard/publication/review/:id
**Then** I see the full article rendered with editorial design typography alongside an editorial feedback panel
**And** I can provide inline comments by selecting text in the article — the comment appears contextually within the article, not in a separate panel (UX: inline editorial feedback adapted from Notion comments)
**And** I can add general editorial feedback in a structured form: overall assessment (text), specific revision requests (list), and a decision: Approve, Request Revisions, or Reject

### AC3: Request Revisions Flow

**Given** I submit my editorial feedback with "Request Revisions"
**When** the feedback is saved via POST /api/v1/articles/:id/feedback
**Then** the article status transitions to REVISION_REQUESTED (FR70 lifecycle)
**And** the author receives a notification that editorial feedback is available
**And** a domain event `publication.article.revision-requested` is emitted

### AC4: Author Revision Workflow

**Given** I am an author with revision requests
**When** I navigate to /dashboard/publication/:id/edit
**Then** I see the editor's inline comments displayed contextually within my article text
**And** I see the general feedback and specific revision requests in a sidebar panel
**And** I can edit my article to address the feedback
**And** on resubmission, a new version is created with version history preserved (FR69) — I can view previous versions via a version selector
**And** the article status transitions back to SUBMITTED, then automatically to EDITORIAL_REVIEW

### AC5: Article Approval & Full Lifecycle

**Given** I am an editor and I approve an article
**When** I select "Approve" in the editorial decision
**Then** the article status transitions to APPROVED (FR70)
**And** an admin can then publish the article, transitioning status to PUBLISHED
**And** the full article lifecycle is tracked: DRAFT → SUBMITTED → EDITORIAL_REVIEW → REVISION_REQUESTED (optional, repeatable) → APPROVED → PUBLISHED → ARCHIVED (FR70)
**And** each state transition is recorded with timestamp, actor, and reason in the audit log (NFR-S6)

## Tasks / Subtasks

### Backend

- [x] **Task 1: Prisma Schema — EditorialFeedback & InlineComment models** (AC: 1, 2, 3, 5)
  - [x]1.1 Add `EditorialDecision` enum to `publication` schema: `APPROVE`, `REQUEST_REVISIONS`, `REJECT`
  - [x]1.2 Add `EditorialFeedback` model: id (UUID PK), articleId (FK→Article), editorId (FK→Contributor), decision (EditorialDecision), overallAssessment (Text), revisionRequests (Json — array of `{ id: string, description: string, resolved: boolean }`), articleVersion (Int — version number at time of feedback), createdAt
  - [x]1.3 Add `InlineComment` model: id (UUID PK), feedbackId (FK→EditorialFeedback), articleId (FK→Article), editorId (FK→Contributor), content (Text), highlightStart (Int — ProseMirror position), highlightEnd (Int — ProseMirror position), articleVersion (Int), resolved (Boolean default false), createdAt, updatedAt
  - [x]1.4 Add relations: Article has `feedback EditorialFeedback[]`, `inlineComments InlineComment[]`; Contributor has `editorialFeedback EditorialFeedback[]`
  - [x]1.5 Add indexes: `idx_editorial_feedback_article_id`, `idx_inline_comments_article_id_version`, `idx_articles_editor_id_status`
  - [x]1.6 Use `@@map("editorial_feedback")` and `@@map("inline_comments")` with `@@schema("publication")`
  - [x]1.7 Create migration SQL file in `apps/api/prisma/migrations/`
  - [x]1.8 Run `pnpm prisma generate` to verify schema compiles

- [x] **Task 2: Shared Package — Editorial Zod schemas, types** (AC: 2, 3, 4, 5)
  - [x]2.1 Add to `packages/shared/src/schemas/article.schema.ts`:
    - `editorialFeedbackSchema`: decision (enum APPROVE/REQUEST_REVISIONS/REJECT), overallAssessment (string, min 10), revisionRequests (array of `{ description: string }`, required when decision is REQUEST_REVISIONS), inlineComments (array of `{ content: string, highlightStart: number, highlightEnd: number }`)
    - `resubmitArticleSchema`: body (string, min 500) — for resubmission after revisions
  - [x]2.2 Add to `packages/shared/src/types/article.types.ts`:
    - `EditorialDecision` type union: `'APPROVE' | 'REQUEST_REVISIONS' | 'REJECT'`
    - `EditorialFeedbackDto`: id, articleId, editorId, decision, overallAssessment, revisionRequests, inlineComments, articleVersion, createdAt
    - `InlineCommentDto`: id, content, highlightStart, highlightEnd, articleVersion, resolved, createdAt
    - `RevisionRequestItem`: id, description, resolved
    - `ArticleRevisionRequestedEvent`: articleId, authorId, editorId, domain, timestamp, correlationId
    - `ArticleApprovedEvent`: articleId, authorId, editorId, domain, timestamp, correlationId
    - `EditorAssignedEvent`: articleId, authorId, editorId, domain, timestamp, correlationId
  - [x]2.3 Add `EDITORIAL_DECISIONS` array constant
  - [x]2.4 Export all new types/schemas from `packages/shared/src/index.ts`

- [x] **Task 3: Editorial Service** (AC: 1, 2, 3, 4, 5)
  - [x]3.1 Create `apps/api/src/modules/publication/editorial.service.ts`:
    - `assignEditor(articleId, correlationId)`: Find eligible editor by domain match + fewest active assignments (articles in EDITORIAL_REVIEW where editorId = editor). If no editor found, log warning and send admin notification. Otherwise update article: set editorId, transition status SUBMITTED→EDITORIAL_REVIEW. Emit `publication.editor.assigned` event
    - `getEditorialView(articleId, editorId)`: Return article with all feedback history, inline comments for current version, and previous versions list. Validate editor is assigned to this article
    - `submitFeedback(articleId, editorId, data, correlationId)`: Validate editor is assigned. Create EditorialFeedback record. Create InlineComment records. Transition status based on decision: APPROVE→APPROVED, REQUEST_REVISIONS→REVISION_REQUESTED, REJECT→ARCHIVED. Emit corresponding domain events. Create audit log entry
    - `getAuthorRevisionView(articleId, authorId)`: Return article with latest editorial feedback, inline comments positioned in text, revision requests checklist. Validate author ownership
    - `resubmitArticle(articleId, authorId, body, correlationId)`: Increment article version, create ArticleVersion snapshot, update article body, transition REVISION_REQUESTED→SUBMITTED. Call `assignEditor()` to re-enter editorial flow. Emit `publication.article.submitted` event
    - `getArticleVersions(articleId, userId)`: Return list of all ArticleVersion records with version number and creation date
    - `getArticleVersion(articleId, versionNumber, userId)`: Return specific version's body content
    - `publishArticle(articleId, adminId, correlationId)`: Admin-only. Transition APPROVED→PUBLISHED, set publishedAt. Emit `publication.article.published`
  - [x]3.2 Add `@OnEvent('publication.article.submitted')` handler in editorial service to trigger `assignEditor()`
  - [x]3.3 Register `EditorialService` in `PublicationModule` providers

- [x] **Task 4: Editorial Controller Routes** (AC: 1, 2, 3, 4, 5)
  - [x]4.1 Add to `apps/api/src/modules/publication/article.controller.ts` (or create separate `editorial.controller.ts`):
    - `GET /api/v1/articles/:id/editorial` → getEditorialView (auth: Editor assigned to article)
    - `POST /api/v1/articles/:id/feedback` → submitFeedback (auth: Editor assigned to article)
    - `GET /api/v1/articles/:id/revisions` → getAuthorRevisionView (auth: Article author)
    - `POST /api/v1/articles/:id/resubmit` → resubmitArticle (auth: Article author)
    - `GET /api/v1/articles/:id/versions` → getArticleVersions (auth: Author or assigned Editor)
    - `GET /api/v1/articles/:id/versions/:version` → getArticleVersion (auth: Author or assigned Editor)
    - `POST /api/v1/articles/:id/publish` → publishArticle (auth: Admin)
  - [x]4.2 Add validation using Zod schemas from shared package
  - [x]4.3 Use `createSuccessResponse()` for all responses

- [x] **Task 5: Notification Integration** (AC: 1, 3, 4, 5)
  - [x]5.1 Add `@OnEvent('publication.editor.assigned')` handler in NotificationService:
    - Send notification to assigned editor: type `ARTICLE_FEEDBACK`, title "New article assigned for review", entityId = articleId, category = 'articles'
  - [x]5.2 Add `@OnEvent('publication.article.revision-requested')` handler:
    - Send notification to author: type `ARTICLE_FEEDBACK`, title "Editorial feedback available", entityId = articleId, category = 'articles'
  - [x]5.3 Add `@OnEvent('publication.article.approved')` handler:
    - Send notification to author: type `ARTICLE_FEEDBACK`, title "Your article has been approved", entityId = articleId, category = 'articles'
  - [x]5.4 Add `@OnEvent('publication.article.published')` handler:
    - Send notification to author: type `ARTICLE_PUBLISHED`, title "Your article is now live", entityId = articleId, category = 'articles'
    - Send notification to editor: type `ARTICLE_PUBLISHED`, title "An article you edited is now live", entityId = articleId, category = 'articles'

- [x] **Task 6: Backend Unit Tests** (AC: 1, 2, 3, 4, 5)
  - [x]6.1 Create `editorial.service.spec.ts`: test assignEditor (domain match, availability sort, no editor fallback), submitFeedback (all three decisions + status transitions), resubmitArticle (version creation, status transition), publishArticle (admin guard, status transition), getEditorialView (editor auth), getAuthorRevisionView (author auth)
  - [x]6.2 Add editorial route tests to `article.controller.spec.ts`: test all new routes, auth guards, validation errors, response shapes

### Frontend

- [x] **Task 7: Editorial Review Page** (AC: 2, 3)
  - [x]7.1 Create `apps/web/app/(dashboard)/publication/review/[id]/page.tsx`:
    - Two-panel layout: article content on left (rendered with Tiptap in read-only mode with editorial typography), editorial panel on right
    - Article content allows text selection for inline comments — selecting text opens a comment input popover anchored to the selection
    - Editorial panel has: overall assessment textarea, revision requests list (add/remove items), decision radio buttons (Approve / Request Revisions / Reject)
    - Submit button sends all feedback at once via `POST /api/v1/articles/:id/feedback`
    - Existing inline comments from previous rounds displayed as highlights in article text
  - [x]7.2 Create `apps/web/components/features/publication/editorial-workflow/editorial-feedback.tsx`:
    - Structured feedback form component
    - Decision selector with clear labels
    - Revision request list builder (add item, remove item, each with textarea)
    - Overall assessment textarea (min 10 chars)
    - Conditional validation: revision requests required when decision is REQUEST_REVISIONS
  - [x]7.3 Create `apps/web/components/features/publication/editorial-workflow/inline-comment.tsx`:
    - Component for rendering inline comments as text highlights with popover
    - On hover/click: shows comment content, editor name, timestamp
    - Highlight uses `surface.secondary` background with subtle border

- [x] **Task 8: Author Revision Interface** (AC: 4)
  - [x]8.1 Update `apps/web/app/(dashboard)/publication/[id]/edit/page.tsx`:
    - When article status is REVISION_REQUESTED, show editorial feedback alongside editor
    - Inline comments rendered as highlights in the Tiptap editor (read-only annotations)
    - Sidebar shows: general feedback, revision requests checklist (read-only), editor name
    - "Resubmit for Review" button replaces "Submit for Review" when in REVISION_REQUESTED status
    - On resubmit: calls `POST /api/v1/articles/:id/resubmit`
  - [x]8.2 Create `apps/web/components/features/publication/editorial-workflow/revision-sidebar.tsx`:
    - Shows overall assessment, revision request items, inline comment summary
    - Read-only display — author addresses feedback by editing the article content
  - [x]8.3 Create `apps/web/components/features/publication/editorial-workflow/version-selector.tsx`:
    - Dropdown showing all versions with creation date
    - On select: loads that version's body content via `GET /api/v1/articles/:id/versions/:version`
    - Current version highlighted, read-only indicator for past versions

- [x] **Task 9: Article Lifecycle Status Display** (AC: 5)
  - [x]9.1 Create `apps/web/components/features/publication/editorial-workflow/article-lifecycle.tsx`:
    - Status progression bar showing all lifecycle states: DRAFT → SUBMITTED → EDITORIAL_REVIEW → REVISION_REQUESTED → APPROVED → PUBLISHED → ARCHIVED
    - Current state highlighted with domain accent color
    - Completed states show checkmark
    - Displays on article detail pages (edit, review, and draft list cards)
  - [x]9.2 Update `apps/web/components/features/publication/article-list/draft-card.tsx`:
    - Show lifecycle status badge for all statuses (not just DRAFT)
    - Card adapts based on status: REVISION_REQUESTED shows "Feedback available" indicator
  - [x]9.3 Update `apps/web/app/(dashboard)/publication/page.tsx`:
    - Extend article list to show all user articles (not just drafts)
    - Add status filter tabs: All, Drafts, In Review, Published
    - For editor role: show "My Reviews" tab with assigned articles

- [x] **Task 10: Data Fetching Hooks** (AC: 2, 3, 4, 5)
  - [x]10.1 Add to `apps/web/hooks/use-article.ts`:
    - `useEditorialView(articleId)`: query, GET /api/v1/articles/:id/editorial
    - `useSubmitFeedback()`: mutation, POST /api/v1/articles/:id/feedback, invalidates editorial view
    - `useAuthorRevisionView(articleId)`: query, GET /api/v1/articles/:id/revisions
    - `useResubmitArticle()`: mutation, POST /api/v1/articles/:id/resubmit, invalidates article queries
    - `useArticleVersions(articleId)`: query, GET /api/v1/articles/:id/versions
    - `useArticleVersion(articleId, version)`: query, GET /api/v1/articles/:id/versions/:version (enabled only when version selected)
    - `usePublishArticle()`: mutation, POST /api/v1/articles/:id/publish (admin only)
  - [x]10.2 Follow existing hook patterns: TanStack Query, `queryKey` arrays, `API_BASE_URL` from env

- [x] **Task 11: Frontend Component Tests** (AC: 2, 3, 4, 5)
  - [x]11.1 Create `editorial-feedback.test.tsx`: test form renders, decision changes, validation (revision requests required when REQUEST_REVISIONS), submit
  - [x]11.2 Create `revision-sidebar.test.tsx`: test feedback display, revision requests render
  - [x]11.3 Create `article-lifecycle.test.tsx`: test all status states render correctly, current state highlighted
  - [x]11.4 Create `version-selector.test.tsx`: test version list renders, selection triggers load

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Module Structure:** Extend existing publication module. Add `editorial.service.ts` alongside `article.service.ts` in the same module — DO NOT create a separate module.

```
apps/api/src/modules/publication/
├── publication.module.ts      (update: add EditorialService provider)
├── article.controller.ts      (update: add editorial routes OR create editorial.controller.ts)
├── article.service.ts         (existing — DO NOT modify except minor changes)
├── editorial.service.ts       (NEW — all editorial business logic)
├── editorial.service.spec.ts  (NEW)
├── article.controller.spec.ts (update with editorial route tests)
└── dto/
    └── editorial-feedback.dto.ts (NEW — optional, Zod-direct validation is acceptable)
```

**API Response Envelope:** Use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`. All endpoints return `{ data, meta: { timestamp, correlationId, pagination? } }`.

**Auth Guards:** Use `@UseGuards(JwtAuthGuard)` for all editorial endpoints. Editor assignment validation in service layer (throw 403 if article.editorId !== userId for editor-only routes). Author ownership validation in service layer (throw 403 if article.authorId !== userId for author-only routes). Admin check for publish endpoint.

**Error Handling:** Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts`. New error codes to add to `packages/shared/src/constants/error-codes.ts`:

- `ARTICLE_NO_EDITOR_AVAILABLE` (422) — no eligible editor found
- `ARTICLE_NOT_ASSIGNED_EDITOR` (403) — editor not assigned to this article
- `EDITORIAL_FEEDBACK_INVALID` (400) — validation failed
- `ARTICLE_INVALID_STATUS_TRANSITION` (409) — reuse existing code

**Domain Events:** Use `EventEmitter2` with standard payload structure:

- `publication.article.submitted` — already emitted by article.service.ts (listen with `@OnEvent`)
- `publication.editor.assigned` — new: `{ articleId, authorId, editorId, domain, timestamp, correlationId }`
- `publication.article.revision-requested` — new: `{ articleId, authorId, editorId, domain, timestamp, correlationId }`
- `publication.article.approved` — new: `{ articleId, authorId, editorId, domain, timestamp, correlationId }`
- `publication.article.published` — new: `{ articleId, authorId, editorId, domain, timestamp, correlationId }`

**Event Listener Pattern (from existing codebase):**

```typescript
@OnEvent('publication.article.submitted')
async handleArticleSubmitted(event: ArticleSubmittedEvent): Promise<void> {
  try {
    await this.assignEditor(event.articleId, event.correlationId);
  } catch (err) {
    this.logger.error('Failed to assign editor', {
      module: 'publication',
      articleId: event.articleId,
      correlationId: event.correlationId,
      error: err.message,
    });
  }
}
```

**Notification Integration:** Use existing `NotificationType` enum values that are already defined in Prisma schema:

- `ARTICLE_FEEDBACK` — for editor assignment, feedback available, article approved
- `ARTICLE_PUBLISHED` — for article published

Notification handler pattern (from `notification.service.ts`):

```typescript
@OnEvent('publication.editor.assigned')
async handleEditorAssigned(event: EditorAssignedEvent): Promise<void> {
  await this.enqueueNotification({
    contributorId: event.editorId,
    type: 'ARTICLE_FEEDBACK',
    title: 'New article assigned for review',
    description: `Article "${event.title}" needs your editorial review`,
    entityId: event.articleId,
    category: 'articles',
    correlationId: event.correlationId,
  });
}
```

**Logging:** Use `Logger` from `@nestjs/common`. Include `module: 'publication'` in all log contexts. Log editor assignment, feedback submission, status transitions at `info` level. Log "no editor available" at `warn` level.

### Editor Assignment Algorithm

The editor assignment logic (FR67) must follow this algorithm:

1. Query all contributors with `role = EDITOR` (or any role that includes editor capability — check CASL abilities)
2. Filter by domain match: editor's `primaryDomain` matches article's `domain` tag
3. For each eligible editor, count active assignments: articles where `editorId = editor.id AND status IN (EDITORIAL_REVIEW, REVISION_REQUESTED)`
4. Sort by fewest active assignments (ascending), then by earliest last review date (to distribute work fairly)
5. Select the first editor from the sorted list
6. If no eligible editors found: log warning, do NOT transition status (keep as SUBMITTED), enqueue admin notification

**IMPORTANT:** For Phase 1, the "editor" role is tracked via the existing RBAC system. Story 8-3 will implement formal editor role eligibility criteria. For this story, editors are contributors whose CASL abilities include `Action.Update` on `'Article'` subject (already defined in `ability.factory.ts` for the EDITOR role).

### Inline Comment Implementation — ProseMirror Positions

Inline comments store `highlightStart` and `highlightEnd` as ProseMirror document positions (integers). These positions reference the resolved position in the Tiptap/ProseMirror document tree at the time of the comment.

**Frontend approach:**

- Use Tiptap's `editor.state.selection` to get the current selection range when creating a comment
- Store `from` and `to` positions from the selection
- To render existing comments: use Tiptap Decoration API to create highlight decorations at the stored positions
- Comments are tied to a specific `articleVersion` — when a new version is created, old inline comments remain associated with the previous version

**Backend storage:**

- `highlightStart` (Int) — ProseMirror `from` position
- `highlightEnd` (Int) — ProseMirror `to` position
- `articleVersion` (Int) — the version of the article body when the comment was created

### Version History Implementation

**On resubmission (author resubmits after revisions):**

1. Create new `ArticleVersion` record with current body + current version number
2. Increment `article.version` field
3. Update `article.body` with new content
4. Previous inline comments remain tied to previous `articleVersion`

**Version viewing:**

- Frontend version selector shows list of versions with dates
- Selecting a past version loads its body content in read-only Tiptap view
- Inline comments for that version are overlaid on the content

### Existing Code to Extend

| File                                                                   | Change                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                                        | Add EditorialDecision enum, EditorialFeedback model, InlineComment model, relations |
| `apps/api/src/modules/publication/publication.module.ts`               | Add EditorialService to providers (and EditorialController if separate)             |
| `apps/api/src/modules/publication/article.controller.ts`               | Add editorial routes (or create editorial.controller.ts)                            |
| `apps/api/src/modules/notification/notification.service.ts`            | Add event handlers for editorial events                                             |
| `packages/shared/src/schemas/article.schema.ts`                        | Add editorialFeedbackSchema, resubmitArticleSchema                                  |
| `packages/shared/src/types/article.types.ts`                           | Add EditorialFeedbackDto, InlineCommentDto, event types                             |
| `packages/shared/src/constants/error-codes.ts`                         | Add editorial error codes                                                           |
| `packages/shared/src/index.ts`                                         | Export new schemas and types                                                        |
| `apps/web/app/(dashboard)/publication/[id]/edit/page.tsx`              | Show editorial feedback when REVISION_REQUESTED                                     |
| `apps/web/app/(dashboard)/publication/page.tsx`                        | Extend to all statuses + editor view                                                |
| `apps/web/components/features/publication/article-list/draft-card.tsx` | Lifecycle status badge                                                              |
| `apps/web/hooks/use-article.ts`                                        | Add editorial hooks                                                                 |

### New Files to Create

| File                                                                                      | Purpose                  |
| ----------------------------------------------------------------------------------------- | ------------------------ |
| `apps/api/src/modules/publication/editorial.service.ts`                                   | Editorial business logic |
| `apps/api/src/modules/publication/editorial.service.spec.ts`                              | Editorial service tests  |
| `apps/web/app/(dashboard)/publication/review/[id]/page.tsx`                               | Editorial review page    |
| `apps/web/components/features/publication/editorial-workflow/editorial-feedback.tsx`      | Feedback form component  |
| `apps/web/components/features/publication/editorial-workflow/inline-comment.tsx`          | Inline comment display   |
| `apps/web/components/features/publication/editorial-workflow/revision-sidebar.tsx`        | Author revision panel    |
| `apps/web/components/features/publication/editorial-workflow/version-selector.tsx`        | Version history dropdown |
| `apps/web/components/features/publication/editorial-workflow/article-lifecycle.tsx`       | Status progression bar   |
| `apps/web/components/features/publication/editorial-workflow/editorial-feedback.test.tsx` | Feedback form tests      |
| `apps/web/components/features/publication/editorial-workflow/revision-sidebar.test.tsx`   | Revision sidebar tests   |
| `apps/web/components/features/publication/editorial-workflow/article-lifecycle.test.tsx`  | Lifecycle bar tests      |
| `apps/web/components/features/publication/editorial-workflow/version-selector.test.tsx`   | Version selector tests   |

### UX Requirements — CRITICAL

**Editorial Review Layout (Desktop):**

- Two-panel side-by-side: article content (left, ~60% width) + editorial panel (right, ~40% width)
- Article rendered in read-only Tiptap with editorial typography (serif headings, 17px body)
- Text selection in article triggers inline comment creation popover
- Editorial panel: sticky positioned, scrolls independently from article content
- Mobile: stacked layout — article on top, editorial panel below (expandable accordion)

**Inline Comments UX:**

- Text highlight: `surface.secondary` background (#F5F1EB) with left border in editor's domain accent color
- On hover: subtle scale (1.01) + shadow, showing comment preview tooltip
- On click: expands to show full comment with editor name, timestamp
- Comments from previous feedback rounds shown in muted state (reduced opacity)

**Feedback Form UX:**

- Decision selector: three options as radio-style cards (not a dropdown), each with icon + description
  - Approve: checkmark icon, "This article is ready for publication"
  - Request Revisions: pencil icon, "The author should address specific feedback"
  - Reject: x icon, "This article does not meet editorial standards"
- Overall assessment: textarea with `minRows={4}`
- Revision requests: dynamic list builder — "Add revision request" button adds a textarea, each with a remove button
- Submit button label changes based on decision: "Approve Article" / "Request Revisions" / "Reject Article"

**Author Revision View:**

- Inline comments displayed as read-only highlights in the Tiptap editor
- Revision sidebar shows: editor name + profile image, overall assessment in serif typography, numbered revision request items
- "Resubmit for Review" button in primary action position
- Status bar shows REVISION_REQUESTED with subtle pulse animation

**Article Lifecycle Bar:**

- Horizontal progression bar with dots for each state
- States: Draft → Submitted → Editorial Review → (Revision Requested) → Approved → Published
- Current state: filled dot with domain accent color + label below
- Completed states: filled dot with `semantic.success` color
- Future states: empty dot with `border.secondary` color
- REVISION_REQUESTED shown as a branch/loop indicator (not linear)

**Typography in Editorial Context:**

- Article body in editorial review: Libre Baskerville/Source Serif Pro, 17px, 1.65 line-height
- Editor comments: Inter/Source Sans Pro, 14px
- Feedback form: Inter/Source Sans Pro (interface typeface)
- Decision labels: Inter/Source Sans Pro, 16px, font-weight 600

**Colors:**

- Domain accents remain: Technology `#3A7D7E`, Fintech `#C49A3C`, Impact `#B06B6B`, Governance `#7B6B8A`
- Inline comment highlight: `surface.secondary` with 2px left border in domain accent
- Approved badge: `semantic.success` (#5A8A6B)
- Revision requested badge: `accent.terracotta` (#C17C60)
- Rejected badge: `semantic.error` (#A85A5A)

### API Endpoint Contracts

**GET /api/v1/articles/:id/editorial** — Editorial view (for assigned editor)

```json
Response 200: {
  "data": {
    "article": { ...ArticleDto },
    "feedbackHistory": [
      {
        "id": "uuid",
        "decision": "REQUEST_REVISIONS",
        "overallAssessment": "Good structure but needs...",
        "revisionRequests": [
          { "id": "uuid", "description": "Strengthen the methodology section", "resolved": false }
        ],
        "inlineComments": [
          { "id": "uuid", "content": "Consider rephrasing this", "highlightStart": 145, "highlightEnd": 203, "articleVersion": 1, "resolved": false }
        ],
        "articleVersion": 1,
        "createdAt": "2026-03-09T..."
      }
    ],
    "versions": [
      { "versionNumber": 1, "createdAt": "2026-03-08T..." }
    ]
  },
  "meta": { "timestamp": "...", "correlationId": "..." }
}
```

**POST /api/v1/articles/:id/feedback** — Submit editorial feedback

```json
Request: {
  "decision": "REQUEST_REVISIONS",
  "overallAssessment": "The article has strong points but...",
  "revisionRequests": [
    { "description": "Expand the methodology section" },
    { "description": "Add supporting data for the main claim" }
  ],
  "inlineComments": [
    { "content": "This needs a citation", "highlightStart": 250, "highlightEnd": 310 }
  ]
}
Response 200: { "data": { ...EditorialFeedbackDto }, "meta": { ... } }
Errors: 403 (not assigned editor), 409 (article not in EDITORIAL_REVIEW status)
```

**GET /api/v1/articles/:id/revisions** — Author revision view

```json
Response 200: {
  "data": {
    "article": { ...ArticleDto },
    "latestFeedback": { ...EditorialFeedbackDto with inlineComments },
    "feedbackHistory": [ ...all previous feedback rounds ],
    "editorProfile": { "id": "uuid", "displayName": "Marcus", "profileImageUrl": "..." }
  },
  "meta": { ... }
}
```

**POST /api/v1/articles/:id/resubmit** — Resubmit after revisions

```json
Request: { "body": "{...updated tiptap JSON...}" }
Response 200: { "data": { ...ArticleDto with status SUBMITTED, incremented version }, "meta": { ... } }
Errors: 403 (not author), 409 (not in REVISION_REQUESTED status), 400 (body too short)
```

**GET /api/v1/articles/:id/versions** — List article versions

```json
Response 200: {
  "data": [
    { "versionNumber": 1, "createdAt": "2026-03-08T..." },
    { "versionNumber": 2, "createdAt": "2026-03-09T..." }
  ],
  "meta": { ... }
}
```

**GET /api/v1/articles/:id/versions/:version** — Get specific version content

```json
Response 200: {
  "data": {
    "versionNumber": 1,
    "body": "{...tiptap JSON...}",
    "createdAt": "2026-03-08T..."
  },
  "meta": { ... }
}
```

**POST /api/v1/articles/:id/publish** — Publish approved article (admin only)

```json
Request: {} // no body needed
Response 200: { "data": { ...ArticleDto with status PUBLISHED, publishedAt set }, "meta": { ... } }
Errors: 403 (not admin), 409 (not in APPROVED status)
```

### Anti-Patterns to Avoid

- **DO NOT** create a separate NestJS module for editorial — it belongs in the existing `publication` module
- **DO NOT** modify `article.service.ts` for editorial logic — all editorial logic goes in `editorial.service.ts`
- **DO NOT** use WebSockets or SSE for real-time editorial feedback — this story uses standard request/response. Real-time collaborative editing is Phase 2
- **DO NOT** implement editor role eligibility criteria — that's Story 8-3
- **DO NOT** implement public article reading experience — that's Story 8-4
- **DO NOT** implement reward split logic — that's Story 8-5
- **DO NOT** implement plagiarism detection — that's Story 8-6
- **DO NOT** create a separate admin dashboard for publication management — admin routes are in the existing article controller
- **DO NOT** use CASL guards on editorial routes yet — use simple JWT guard with service-layer checks (CASL for articles will be refined in Story 8-3)
- **DO NOT** implement image upload for inline comments — text-only comments in this story
- **DO NOT** store inline comment positions as character offsets in plain text — use ProseMirror document positions that work with the Tiptap document structure

### Dependencies to Install

**Backend (apps/api):** No new dependencies needed — all required packages (EventEmitter2, Prisma, etc.) are already installed.

**Frontend (apps/web):** No new dependencies needed — Tiptap and all required packages are already installed from Story 8-1.

### Testing Standards

- **Vitest** for all tests (unit + integration)
- **@nestjs/testing** for NestJS module testing
- Tests co-located: `editorial.service.spec.ts` next to `editorial.service.ts`
- Mock PrismaService, EventEmitter2, Logger in service tests
- Mock service in controller tests
- Frontend component tests: Vitest + React Testing Library
- Test editorial feedback form validation (conditional validation for revision requests)
- Test inline comment highlight rendering
- Test version selector interaction
- Test lifecycle status bar for all states

### Previous Story Learnings (from Story 8-1)

- SlashMenu integration: Ensure new components are properly wired to their parent — Story 8-1 had a bug where SlashMenu was never connected to the editor
- Pagination: Use `useInfiniteQuery` for paginated lists (not `useQuery` with manual cursor management) — this pattern is used in 10+ hooks
- DTO consistency: Zod-direct validation is acceptable; separate DTO files are optional
- Slug uniqueness: Already has secondary uniqueness check + timestamp fallback
- Domain colors: Use shared `publication/domain-colors.ts` utility (already extracted in 8-1)
- Service pattern: `@Injectable()` with `private readonly logger = new Logger(ServiceName.name)`
- Controller route definition: `@Controller({ path: 'articles', version: '1' })`
- Response helper: `createSuccessResponse(data, req.correlationId)`
- Frontend: `'use client'` directive, CSS custom properties, aria-labels for accessibility, skeleton loaders for loading states

### Project Structure Notes

- Alignment: Editorial service extends existing `publication/` module — follows same structure as evaluation module where multiple services coexist
- Frontend editorial-workflow components go in `components/features/publication/editorial-workflow/` — architecture specifies this path
- Review page at `(dashboard)/publication/review/[id]/page.tsx` — matches architecture file tree
- No variances or conflicts with existing structure detected

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Publication Module Structure, Event Naming, Logging Standards, Frontend Routes]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Editorial Workflow Flow, Inline Feedback Pattern, Typography, Colors]
- [Source: _bmad-output/planning-artifacts/prd.md — FR67-FR70, NFR-S6]
- [Source: _bmad-output/implementation-artifacts/8-1-article-authoring-interface.md — Previous story patterns and learnings]
- [Source: apps/api/src/modules/publication/ — Existing module structure]
- [Source: apps/api/src/modules/notification/notification.service.ts — Event handler and notification patterns]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts — CASL ability definitions for Editor role]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
