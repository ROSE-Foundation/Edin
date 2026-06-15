---
title: 'Admin Article Workflow Overview & Override Console'
type: 'feature'
created: '2026-06-15'
status: 'done'
baseline_commit: 'c6a677c35356d417fe67466b78f1f512bad803c6'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins have no single place to see every editorial Article and its lifecycle state. Today they only see moderation-flagged items; they cannot tell which document is stuck, who is responsible for the next step, or unblock an item when the normal actor (author/editor) is unavailable.

**Approach:** Add an admin screen that lists all Articles with their current `ArticleStatus`, the actor who must act next, and god-mode controls that let an admin force any valid workflow transition (acting on behalf of any actor), choosing the outcome at branching states. Reuse existing transition services, adding an admin-override flag where ownership/editor checks currently block admins; every forced transition is audited and requires a reason.

## Boundaries & Constraints

**Always:**

- Restrict every new endpoint to ADMIN via the existing `JwtAuthGuard, AbilityGuard` + `@CheckAbility((a) => a.can(Action.Manage, 'all'))` pattern.
- Reuse existing transition logic (`ArticleService.submitArticle`, `EditorialService.assignEditor/submitFeedback/resubmitArticle/publishArticle`, `ModerationService.adminDismissFlag/adminRequestCorrections/adminRejectArticle/adminUnpublishArticle`) so status changes, emitted events, and side-effects stay identical to the normal flow.
- Record the admin as the actor and call `AuditService.log` with `action: 'ADMIN_FORCE_TRANSITION'` (plus the concrete sub-action) for every transition; `reason` is mandatory.
- Only offer transitions that are valid from the article's current status; a forced transition into an invalid source status must be rejected with a 4xx domain error, not silently no-op.

**Ask First:**

- Bypassing the strict content validation (abstract ≥50, body ≥500) when force-submitting a DRAFT that fails it.
- Adding any brand-new article status, event name, or DB column.

**Never:**

- Mutate Article rows directly from the admin service — always go through the transition services.
- Touch the GitHub `Contribution`/`Evaluation` pipeline or non-Article entities.
- Allow non-ADMIN roles to reach the list or transition endpoints.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                                                                 | Expected Output / Behavior                                                                                 | Error Handling                                             |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| List page            | GET `/admin/articles?status=EDITORIAL_REVIEW&limit=20`                        | Paginated articles; each has status, author, editor, `moderationStatus`, `nextActor`, `availableActions[]` | N/A                                                        |
| Next actor — review  | Article `EDITORIAL_REVIEW`, editor assigned                                   | `nextActor = { role: 'EDITOR', name }`, actions = approve/request-revisions/reject                         | N/A                                                        |
| Next actor — flagged | Article `SUBMITTED` with `FLAGGED` moderation report                          | `nextActor = { role: 'ADMIN' }`, actions = moderation dismiss/corrections/reject                           | N/A                                                        |
| Force approve        | POST transition `{ action: 'APPROVE', reason }` on `EDITORIAL_REVIEW` article | Status → `APPROVED`, `publication.article.approved` emitted, audit row written                             | N/A                                                        |
| Force publish        | POST transition `{ action: 'PUBLISH', reason }` on `APPROVED` article         | Status → `PUBLISHED`, `publication.article.published` emitted                                              | N/A                                                        |
| Invalid transition   | POST `{ action: 'PUBLISH' }` on a `DRAFT` article                             | Rejected                                                                                                   | 409/400 domain error `INVALID_TRANSITION`; state unchanged |
| Missing reason       | POST transition with empty `reason`                                           | Rejected                                                                                                   | 400 validation error                                       |
| Non-admin caller     | Any role ≠ ADMIN hits either endpoint                                         | Rejected                                                                                                   | 403                                                        |

</frozen-after-approval>

## Code Map

- `apps/api/src/modules/admin/articles.controller.ts` -- NEW: `GET /admin/articles`, `POST /admin/articles/:id/transition`; admin guards.
- `apps/api/src/modules/admin/articles.service.ts` -- NEW: paginated list (cursor pattern from `contributors.service.ts`) + `nextActor`/`availableActions` derivation + `forceTransition` dispatcher delegating to existing services.
- `apps/api/src/modules/admin/admin.module.ts` -- register new controller/service; import publication module providers (ArticleService, EditorialService, ModerationService).
- `apps/api/src/modules/publication/article.service.ts` -- add optional `{ adminOverride?: boolean }` to `submitArticle` to skip the `authorId === userId` check (L216-221).
- `apps/api/src/modules/publication/editorial.service.ts` -- add optional `{ adminOverride?: boolean }` to `submitFeedback` (skip editor check L259-264) and `resubmitArticle` (skip author check L457-462; reuse current body when none supplied).
- `packages/shared/src/schemas/article.schema.ts` -- NEW `adminArticleTransitionSchema` (action enum, `reason` required, optional `feedback`/`revisionRequests`/`body`).
- `packages/shared/src/types/article.types.ts` -- NEW `AdminArticleListItemDto`, `ArticleNextActor`, `AdminTransitionAction` types; export from `@edin/shared`.
- `apps/web/app/(admin)/admin/articles/page.tsx` -- NEW admin page.
- `apps/web/components/features/admin/articles/articles-list.tsx` -- NEW table (status badge, next-actor column, per-row action menu).
- `apps/web/components/features/admin/articles/transition-dialog.tsx` -- NEW confirm dialog; at branching states lets admin pick the outcome; captures reason.
- `apps/web/hooks/use-admin-articles.ts` -- NEW list query + transition mutation (invalidate `['admin','articles']`); follow `use-moderation.ts`.
- `apps/web/app/(admin)/layout.tsx` -- add `{ href: '/admin/articles', label: 'Articles' }` to `ADMIN_NAV_ITEMS`.

## Tasks & Acceptance

**Execution:**

- [x] `packages/shared/src/types/article.types.ts` -- add `AdminTransitionAction` union, `ArticleNextActor`, `AdminArticleListItemDto`; export -- shared contract for BE+FE.
- [x] `packages/shared/src/schemas/article.schema.ts` -- add `adminArticleTransitionSchema` -- validate transition payloads.
- [x] `apps/api/src/modules/publication/article.service.ts` -- add `adminOverride` option to `submitArticle` -- let admin force DRAFT→SUBMITTED.
- [x] `apps/api/src/modules/publication/editorial.service.ts` -- add `adminOverride` to `submitFeedback` and `resubmitArticle` -- let admin force review outcomes and resubmit.
- [x] `apps/api/src/modules/admin/articles.service.ts` -- implement `list()` (filters: status, domain, search; cursor pagination) joining author/editor/latest moderation report, deriving `nextActor`+`availableActions`; implement `forceTransition()` dispatching each action to the matching existing service with `adminId`, mandatory reason, audit log -- core backend.
- [x] `apps/api/src/modules/admin/articles.controller.ts` -- wire both endpoints with admin guards, Zod validation, correlationId -- HTTP surface.
- [x] `apps/api/src/modules/admin/admin.module.ts` -- register controller/service and dependencies -- DI wiring.
- [x] `apps/web/hooks/use-admin-articles.ts` -- list query + transition mutation -- data layer.
- [x] `apps/web/components/features/admin/articles/transition-dialog.tsx` + `articles-list.tsx` -- table + branching action UI + reason capture + toast -- UI.
- [x] `apps/web/app/(admin)/admin/articles/page.tsx` + `layout.tsx` nav entry -- page + navigation.
- [x] `apps/api/src/modules/admin/articles.service.spec.ts` -- unit-test `nextActor`/`availableActions` derivation per status and the invalid-transition rejection from the I/O matrix -- regression guard.

**Acceptance Criteria:**

- Given an ADMIN on `/admin/articles`, when the page loads, then every Article (all statuses) is listed with its status, author, assigned editor (if any), and the next actor.
- Given an article in `EDITORIAL_REVIEW`, when the admin opens its action menu, then approve / request-revisions / reject are offered and selecting one transitions the article exactly as the assigned editor would, emitting the same event.
- Given an article in `APPROVED`, when the admin clicks Publish with a reason, then status becomes `PUBLISHED` and `publication.article.published` is emitted.
- Given any forced transition, when it succeeds, then an audit log row with the admin actor, reason, previous and new state exists.
- Given a transition whose action is invalid for the current status, when submitted, then the API returns a domain error and the article is unchanged.
- Given a non-ADMIN user, when calling either endpoint, then the response is 403.

## Design Notes

`nextActor` / `availableActions` are a pure function of (status, moderationStatus, editor presence):

| Status                              | nextActor         | availableActions (god-mode)                                           |
| ----------------------------------- | ----------------- | --------------------------------------------------------------------- |
| DRAFT                               | AUTHOR            | SUBMIT                                                                |
| SUBMITTED + report FLAGGED          | ADMIN             | MODERATION_DISMISS, MODERATION_REQUEST_CORRECTIONS, MODERATION_REJECT |
| SUBMITTED (clean / awaiting editor) | SYSTEM            | ASSIGN_EDITOR                                                         |
| EDITORIAL_REVIEW                    | EDITOR (assigned) | APPROVE, REQUEST_REVISIONS, REJECT                                    |
| REVISION_REQUESTED                  | AUTHOR            | RESUBMIT                                                              |
| APPROVED                            | ADMIN             | PUBLISH                                                               |
| PUBLISHED                           | —                 | UNPUBLISH                                                             |
| ARCHIVED                            | —                 | (none)                                                                |

`forceTransition` maps action→existing call: SUBMIT→`submitArticle(id, adminId, cid, {adminOverride:true})`; ASSIGN*EDITOR→`assignEditor`; APPROVE/REQUEST_REVISIONS/REJECT→`submitFeedback(id, adminId, {decision,...}, cid, {adminOverride:true})`; RESUBMIT→`resubmitArticle(id, adminId, body?, cid, {adminOverride:true})`; PUBLISH→`publishArticle`; UNPUBLISH/MODERATION*\*→existing `ModerationService` admin methods. Each is already audited internally; add one wrapping `ADMIN_FORCE_TRANSITION` audit entry capturing the admin's reason.

## Verification

**Commands:**

- `pnpm --filter @edin/api test articles.service` -- expected: derivation + invalid-transition tests pass.
- `pnpm --filter @edin/api build && pnpm --filter @edin/web build` -- expected: type-checks pass (shared DTOs resolve on both sides).
- `pnpm --filter @edin/api lint && pnpm --filter @edin/web lint` -- expected: clean.

**Manual checks:**

- As ADMIN, load `/admin/articles`: all statuses listed with correct next-actor; force an `EDITORIAL_REVIEW` article through approve→publish and confirm it appears in the public reading experience; confirm an audit row per step.

## Suggested Review Order

**Workflow derivation (the design core)**

- Entry point: pure state→actor→actions mapping; the whole feature hinges on this table.
  [`articles.service.ts:27`](../../apps/api/src/modules/admin/articles.service.ts#L27)
- Gate fix: ASSIGN_EDITOR only once moderation has cleared (not while PENDING).
  [`articles.service.ts:209`](../../apps/api/src/modules/admin/articles.service.ts#L177)

**God-mode transition (highest risk)**

- Validates action against current state, delegates, asserts no-op editor assign, audits previous+new state.
  [`articles.service.ts:233`](../../apps/api/src/modules/admin/articles.service.ts#L233)
- Dispatcher mapping each action to the existing transition service with `adminOverride`.
  [`articles.service.ts:317`](../../apps/api/src/modules/admin/articles.service.ts#L317)
- Ownership/editor checks now bypassable only via the admin override flag.
  [`article.service.ts:221`](../../apps/api/src/modules/publication/article.service.ts#L221)
  [`editorial.service.ts:260`](../../apps/api/src/modules/publication/editorial.service.ts#L260)

**HTTP surface & validation**

- Admin-guarded endpoints; enum-validated query params (no Prisma 500); mandatory reason.
  [`articles.controller.ts:52`](../../apps/api/src/modules/admin/articles.controller.ts#L52)
- Transition payload schema: reason ≥10, revision requests for REQUEST_REVISIONS, body ≥500 if overridden.
  [`article.schema.ts:135`](../../packages/shared/src/schemas/article.schema.ts#L135)

**Shared contract**

- The DTO the API returns and the UI renders (status, nextActor, availableActions).
  [`article.types.ts:380`](../../packages/shared/src/types/article.types.ts#L380)

**Frontend binding**

- List query + transition mutation with cache invalidation.
  [`use-admin-articles.ts:23`](../../apps/web/hooks/use-admin-articles.ts#L23)
- Table: status badges, next-actor column, per-row action buttons → dialog + toast.
  [`articles-list.tsx:54`](../../apps/web/components/features/admin/articles/articles-list.tsx#L54)
- Branch-aware dialog: choose outcome, capture reason / revision requests.
  [`transition-dialog.tsx:44`](../../apps/web/components/features/admin/articles/transition-dialog.tsx#L44)

**Supporting**

- Unit tests: derivation per status, moderation gate, invalid-transition + no-op assign rejection, audit state.
  [`articles.service.spec.ts:8`](../../apps/api/src/modules/admin/articles.service.spec.ts#L8)
- Module wiring + nav entry.
  [`admin.module.ts:1`](../../apps/api/src/modules/admin/admin.module.ts#L1)
