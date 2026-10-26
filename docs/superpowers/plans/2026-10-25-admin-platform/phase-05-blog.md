# Phase 5: Blog workflow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 5.1–5.4). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (B2 "Insights" → "Blog"). Branch `feat/dynamic-platform`. Never push.

**Goal:** Port SP's article workflow to CP's Blog. That covers:
- authoring, with author / editor / owner rules
- submit-for-review
- publish, schedule and unpublish
- revisions
- the TipTap article editor, which must keep CP's lead and checklist variants
- categories with `showInFilter`
- the review queue
- the in-process scheduler with SP's jobs

Everything lives at `/admin/blog/*`. The public `/blog` and `/blog/[slug]` pages stay at 0 px.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only. Port the final-state files. Rationale: SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-05-articles.md`, the mk-parity `phase-B-ia.md` (Insights IA) and `phase-D1` (article SEO tab, deferred to 8.1).

## Global constraints for this phase

- Master Global Constraints apply in full.
- Public site stays at 0 px. Visual 44/44, plus the frozen renderer contract `tests/unit/rich-text/frozen-markup.ts`.
- Closure rule as in Phase 4. List every closure file.
- **B2.** SP's `app/(admin)/admin/(panel)/insights/**` maps to `app/(admin)/admin/(panel)/blog/**`. Routes, links, breadcrumbs, ⌘K entries, Help text and tests say "Blog", never "Insights". Grep for `insights` must find nothing outside docs.
- CP copy only, never SP's (no security wording).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R5-1 Authors.** Keep SP's `authorId` workflow. RBAC depends on it: an author edits only their own drafts. The author picker stays in the admin. CP's public byline stays template-driven (`pages.blog.article.authorName/authorBio`, "The Clean Team"), so the public markup is unchanged. Seeded articles have `authorId: null`. The editor treats null as "no author" and owners and editors can still edit them. Authors read every article but edit, submit and delete only their own (SP parity). Add a test for the null-author case.
- **R5-2 Article shape.** Use CP's `lib/schemas/content/article.ts` (title, slug, excerpt, category, cover, date fields, readTimeMinutes, tags, lead, body as TipTap). Rewrite SP's article editor meta for CP fields. Read time is computed from the body (SP rule: 200 wpm, minimum 1). When the body is null, or deep-equals the currently published body, keep the existing `readTimeMinutes` (the seeded values, e.g. 6 and the 5-signs 5). Recompute only when the body changes.
- **R5-3 Editor UX** (Phase 4 Task 3 deferrals):
  - The Lead toggle applies only to **top-level** paragraphs. It is disabled inside lists and blockquotes, matching `lib/rich-text/render.tsx`.
  - The editor styles `[data-variant="lead"]` and `[data-variant="checklist"]` so the owner can see them.
  - Keep `paragraphsText` variant-free on the server too: the stored `paragraphsText` schema rejects or strips `variant`. Add a test.
- **R5-4 Categories screen** lives at `/admin/blog/categories`. It covers CRUD, reorder and `showInFilter`. Deleting a category that has articles returns 409. Every write invalidates `tag.categories`. Article caches also carry `tag.categories` (SP parity, pinned by a test), so they refresh too.
- **R5-5 Scheduler.** Create `instrumentation.ts` (Phase 1 R5) with SP's scheduler and shutdown hooks. Jobs:
  - `publish-scheduled`
  - `prune-revisions`
  - `delete-retired-media` (Phase 4 deferral)

  `purge-leads` arrives in 7.4 and backup in 11.1. In `tests/integration/api/media-manage.test.ts`, the grace-period case (around line 235) calls `deleteRetiredMediaFile` directly. Restore it to use `tick({ jobs: [deleteRetiredMediaJob] })` as SP does, with the "no job row" assertion going through the scheduler. Also rename the local `officer` in `tests/dom/rich-text-editor.test.tsx:424`. Each job is registered only when its module exists. The scheduler must not start during `next build`. Two concurrent ticks must publish a due article exactly once (`SKIP LOCKED`).
- **R5-6 Revalidation from jobs.** Jobs can't call `revalidateTag`. Use SP's internal signed route `/api/v1/internal/revalidate`, HKDF purpose `cron`, `x-cp-*` headers.
- **R5-7 Deferred items restored here:**
  - dashboard "drafts in review" links now land on `/admin/blog`
  - the Help Blog topic is now true
  - the article-related `b3-panel-pages` and `page-guards` pins
  - `command-palette-articles`
  - the `delete-retired-media` job runner
- **R5-8 Phase 4 final-review fixes** carried in, if the controller adds any. See the ledger.

---

### Task 1: Articles service and API (master 5.1)

**Files (port):**
- `server/modules/articles/{routes,service,repo,policy,transitions}.ts` and the mount
- `lib/schemas/api/articles.ts`
- the CP-shape adaptations (R5-2)

**Tests (port and adapt):** SP's articles integration and unit tests. They must cover:
- author creates and updates own draft; submit moves to `in_review`
- author publish → 403; author editing others' → 403
- editor publish, schedule and unpublish
- scheduling in the past → 422
- readTime computed (R5-2)
- stale version → 409
- each transition audited and given a revision
- publish invalidates `tag.articles` and `tag.article(slug)`
- the null-author case (R5-1)

**Commit:** `feat: add articles api with review workflow`

---

### Task 2: Article editor (master 5.2; R5-3)

**Files (port):**
- `components/admin/articles/{article-editor,new-article-form,…}`
- article `editor-meta` for CP fields
- the R5-3 editor and schema changes in `components/admin/rich-text/*` and `lib/schemas/common.ts`

**Tests:**
- port SP's `article-editor` and `new-article-form` DOM tests
- add the R5-3 cases: lead disabled in lists and blockquotes, variant styling present, server strips `paragraphsText` variants
- add a full round trip: open the seeded 5-signs article, save without changes, check the stored body is deep-equal and the public render equals `frozen.WHOLE`

**Commit:** `feat: add article editor with cp block variants`

---

### Task 3: Blog admin screens (master 5.3; B2, R5-4)

**Files (port, renamed from insights):**
- `app/(admin)/admin/(panel)/blog/{page,new/page,[id]/page,categories/page}.tsx`
- `components/admin/articles/{articles-screen,review-queue,schedule-dialog,…}`
- the categories screen config

**Tests:**
- port `articles-screen`, `schedule-dialog`, `command-palette-articles` and the `b3-panel-pages` and `page-guards` pins
- e2e `articles.spec.ts` and `scheduled-publish.spec.ts`, adapted. Cover create, submit, editor publish, visible on `/blog`, schedule, and categories `showInFilter` reflected in the public filter
- clean up in `afterAll`
- `git grep -niP "insights"` outside docs must be empty

**Commit:** `feat: add blog admin screens and categories`

---

### Task 4: Scheduler and jobs (master 5.4; R5-5, R5-6)

**Files (port):**
- `instrumentation.ts`
- `server/lib/{scheduler,shutdown}.ts`
- `server/lib/jobs/{index,publish-scheduled,prune-revisions,delete-retired-media}.ts`
- `server/modules/internal/routes.ts` and the mount
- `server/modules/jobs/*` if not already present

**Tests:** port SP's
- `scheduler-start` / `scheduler-stop`
- the concurrent-tick integration test (exactly once)
- `jobs.lastError`
- prune keeps the newest 50
- internal-signature route tests

Also check that the build does not start the scheduler, which SP's test covers.

**Commit:** `feat: add in-process scheduler and content jobs`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```
