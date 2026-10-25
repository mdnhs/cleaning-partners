# Phase 4: Admin shell and editors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 4.1–4.7). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (O2, O3, B2, B4). Branch `feat/dynamic-platform`. Never push.

**Goal:** Give CP's admin SP's full panel:
- the floating-panel shell, nav, ⌘K, dock, impersonation banner and website card;
- the SchemaForm editors with autosave, ⌘S, publish-with-diff, revisions, conflict handling and live preview;
- the page, settings, services and collection screens, including Testimonials;
- the dashboard, Help, Activity log and Users screens.

Everything is wired to CP's Phase 3 content model. The public site stays at 0 px.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only. Port the final-state files, which carry the MK/JW look. These SP plans give the rationale:
- `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-04-admin.md` (Tasks 1–12)
- `phase-04b-jw-parity.md` (Tasks 1–12)
- `docs/superpowers/plans/2026-10-19-mk-parity/phase-{A,B}-*.md`

## Global constraints for this phase

- The master Global Constraints apply in full: branding and sp→cp, the dev ports, the three env vars, the no-env build, the code boundaries, and the Playwright config.
- **The public site stays at 0 px.** Visual is 44/44. Any task that touches `app/(site)`, `templates/**`, public components, `proxy.ts` or `next.config.ts` runs `pnpm test:visual`.
- **Closure rule** (Phase 2): port transitive `lib/**`, `server/lib/**`, non-route `server/modules/**` and `components/admin/**` verbatim and rebranded. Route files and admin pages are ported only by the task that names them. List every closure file in the report.
- **B2.** SP's "Insights" is "Blog" at `/admin/blog/*` (nav id `blog`). Port SP's `app/(admin)/admin/(panel)/insights/**` pages only in Phase 5. In this phase the nav entry exists and its pages 404 until then.
- **SP admin copy.** Help text, empty states, Next-up items and descriptions get rebranded to Cleaning Partners and a cleaning context: "services", not "security services". Never leave SP business wording. The branding gate catches names; reviewers check wording.
- **No public builder pages yet.** SP's `pages/custom/[id]` and builder-pages routes belong to Phase 10.
- Commits are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R4-1. Media in Phase 4.** SchemaForm's media widget and the rich-text editor need the media picker and media API. Port them here:
  - `server/modules/media/{routes,service}.ts`, plus upload, list and file routes;
  - `server/lib/{image,media-sniff,svg-sanitize}.ts`;
  - `server/lib/storage/{index,disk}.ts`;
  - `components/admin/media/{picker-dialog,uploader,…}` as needed by the picker.

  Storage resolves to **disk** until R2 is configured. The R2 driver and the `cp/` prefix (Review Focus 2), the media library screen, and the migrate job stay in Phase 6. In this phase, do not port `server/lib/storage/r2.ts`'s write paths. If the closure demands it, port it with a hard guard that throws "R2 disabled until Phase 6".
- **R4-2. The rich-text editor** (`components/admin/rich-text/**`) is ported now with SP's extensions, plus CP's two attrs: `paragraph.variant: "lead"` and `bulletList.variant: "checklist"`. These are TipTap extension attributes that serialise exactly as `lib/schemas/common.ts` expects. Normalise a `null` attr away on save (Task 4 review).
  - The `paragraphsText` widget mode, used by `services.overview`, must allow no variants. Strip them on save, and add a test.
  - The editor's output must render identically through `lib/rich-text/render.tsx`. Its frozen contract must not change.
- **R4-3. Collections.** SP's mounts are `/team`, `/clients`, `/group-companies` and `/categories`. CP adds **`/testimonials`** with the same small-collection behaviour: immediate publish, CRUD, reorder and `invalidate(tag.testimonials)`.
  - `components/admin/collections/configs.tsx` gains a Testimonials config with name, initials, quote and rating (1–5 select).
  - Team drops email (migration 0022).
  - Categories keep `showInFilter`.
  - Restore SP's DOM and integration tests for collections, adapted.
- **R4-4. Services editor.** It uses CP's service shape (`components/admin/services/service-meta.ts`): title, slug, icon, cover, summary, tags, heroDescription, overviewTitle, overview (paragraphs widget), included[], places[] and SEO.
  - New-service creates a draft.
  - Publish invalidates `tag.services` and `tag.service(slug)`.
  - Slug changes flush the old tag, as SP's `service-slug-flush` test does.
- **R4-5. Settings editors** use CP's 18-key set: `settings-meta.ts` labels and groups for `sections.{clients,whyChooseUs,contact,map,team,testimonials,howItWorks}`, `contact`, `footer`, `navigation`, `site` and `microcopy`.
  - `consent`, `tracking`, `customCode` and `seo.defaults` are refused here; they belong to Phases 8 and 9.
  - `/admin/settings` → `/admin/settings/site` (the proxy 307 from Phase 2) must now land on a real page.
- **R4-6. Help, dashboard and Next-up copy** is CP. "Next up" items are computed from CP state as SP does: SMTP unset, R2 unset, 2FA off for owner/admin, drafts in review, unassigned leads. Lead-related items read an empty leads table until Phase 7.
- **R4-7. Deferred tests restored here** (ledger owners):
  - `account-tabs` user-menu case and the `account.spec` user-menu steps;
  - `page-guards`, `b3-panel-pages`, `palette-actions`;
  - `permission-matrix` and `use-permission` DOM tests;
  - `preview.test`;
  - `audit-filters` / activity;
  - DOM `users`;
  - a publish-path invalidation proof (Phase 3 Task 9 deferral): publishing `pages.home` through the pages service expires `tag.page("home")`.

  Also delete the temporary `components/admin/auth/sign-out-control.tsx` and the plain header's Account link, and restore SP's impersonation banner and stop control (master Changes).

- **R4-8. Porting traps** (Phase 3 final review). Do not port these SP files as-is:
  - SP's `service-meta.ts`/service editor uses `description`, `heroImage`, `image`, `imageAlt` and `detail.*`. Rewrite them for CP's shape (4.6).
  - SP's team config shows an email column, which migration 0022 dropped (4.6).
  - SP's `settings-meta.ts` has `sections.about`, `sections.enquireBanner` and operations fields. Write the CP version (4.5).
  - `components/admin/schema-form/editor-meta.ts` defines `OptionCollection` locally. Restore SP's import from `lib/schemas/api/search` when search is ported (4.1).
  - `loadSiteSources` lacks SP's `assertPreviewAccess`, and the queries read drafts in draft mode. Restore the guard in 4.2, before preview ships.
  - **The TipTap editor must keep the `variant` attrs on load and save** (custom extension attributes with parseHTML/renderHTML/default). Otherwise the first save of an article silently drops lead and checklist (master Review Focus 3). Add a load → save round-trip test in 4.3.
  - Long-copy fields (service `summary`/`heroDescription`, testimonial `quote`, `footer.tagline`) need `widget: "textarea"` in their meta (4.5, 4.6).
  - The publish-path invalidation proof covers pages, **services, testimonials and categories** (4.2/4.6).

---

### Task 1: Admin shell, nav, ⌘K, search (master 4.1)

**Files:** port
- `components/admin/shell/**`. `sp-mark.tsx` is not ported; use Phase 2's CP chip in `brand-mark.tsx`.
- `components/admin/{kit,section-tabs,data-table,form}/**`, `providers.tsx`, `page-header.tsx`, `option-select.tsx`, `filter-field.tsx`.
- `hooks/*`.
- `lib/admin/palette-*` (if present).
- `server/modules/search/*` and the `/search` mount.
- The real `app/(admin)/admin/(panel)/layout.tsx` with AdminShell, `(panel)/error.tsx`, and every `requirePage` guard.

Also delete `sign-out-control.tsx` and the temporary Account link (R4-7).

**Tests:** port SP's shell DOM tests:
- `admin-shell`, `admin-shell-chrome`, `command-palette`, `footer-dock`, `section-rail`/`section-tabs`, `admin-kit`, `data-table`, `providers`;
- restore `page-guards`, `b3-panel-pages`, `palette-actions`, `use-permission`, and the `account-tabs` user-menu case.

Then:
- adapt `tests/e2e/admin-layout.spec.ts` and `account.spec.ts` (user menu);
- check the website card shows `cleaning.raynx.ie` (or the `site.productionUrl` setting);
- check ⌘K searches CP records: pages, services, articles, team, clients and testimonials.

**Acceptance:**
- The sidebar shows SP's groups with B2 (Blog) and Testimonials under Collections, filtered by role.
- Below 1024 px the nav is a sheet.
- ⌘K opens, searches and navigates.
- Impersonating shows the banner with a stop control.
- The dock shows Users & roles, Activity log, Help and Log out.
- e2e is green.
- Screenshot the shell (desktop and mobile, light and dark) into the report folder and view it. It must show the CP palette with no SP green.

**Commit:** `feat: add admin shell, navigation and command palette`

---

### Task 2: Versioning, revisions, preview, pages API (master 4.2)

**Files:** port
- `server/lib/versioning.ts`;
- `server/modules/{pages,revisions,preview}/{routes,service,…}.ts` and mounts;
- `components/preview-bar.tsx` (public; renders nothing unless previewing);
- the preview proxy and route bits.

**Tests:** port SP's pages, revisions and preview integration tests:
- stale version gives 409 with `current`;
- publish copies draft to published, writes a revision and an audit entry, and invalidates the tag;
- restore;
- template validation gives 422 `fieldErrors`;
- restore `preview.test`;
- add the publish-path invalidation test (R4-7).

**Acceptance:**
- The suite passes.
- Visual is 44/44, because the preview bar is absent for visitors.

**Commit:** `feat: add versioned pages api, revisions and draft preview`

---

### Task 3: SchemaForm, widgets, rich-text editor, media picker (master 4.3; R4-1, R4-2)

**Files:** port
- `components/admin/schema-form/**`. Extend Phase 3's types-only `editor-meta.ts`; do not duplicate it.
- `components/admin/rich-text/**`, with the CP variant attrs.
- `components/admin/media/{picker-dialog,uploader,…}` used by the picker.
- The media service and routes, and the disk storage, per R4-1.

**Tests:** port SP's DOM tests:
- `schema-form*`, `rich-text-editor`, `rich-text-extensions`, `rich-text-shortcuts`, `media-picker-upload`, `media-upload-request`, `option-select`, `block-form` (if the schema-form needs it).

Add:
- every CP template schema and settings schema renders in SchemaForm with no missing widget;
- the lead and checklist variants round-trip editor → JSON → `ArticleBlocks` HTML, equal to the frozen contract;
- the `paragraphsText` mode strips variants.

**Acceptance:**
- The suite passes.
- An upload to disk works in the dev server.
- No R2 writes.

**Commit:** `feat: add schema form, rich-text editor and media picker`

---

### Task 4: Page editor screen (master 4.4)

**Files:** port
- `components/admin/editor/**` (editor layout, save state, publish dialog with diff, revision drawer, conflict dialog, unsaved guard, live preview pane, versioned editor);
- `components/admin/pages/{pages-list,page-editor}.tsx`;
- `hooks/use-autosave.ts`;
- `app/(admin)/admin/(panel)/pages/{page.tsx,[key]/page.tsx}`. Do not port `custom/[id]`.

**Tests:** port the DOM tests:
- `editor-layout`, `versioned-editor`, `use-autosave`, `preview-pane`, `schedule-dialog` (if pages use it), `pages-list`.

Port and adapt e2e `tests/e2e/page-editor.spec.ts`:
- edit the home hero heading, autosave shows "Saved", publish, and `/` shows the new heading;
- ⌘S works;
- the unsaved guard prompts;
- a 409 opens the conflict dialog;
- the preview shows the draft only to a signed-in user;
- reset the DB afterwards so visual stays deterministic. Follow SP's e2e seed reset.

**Acceptance:** e2e is green and visual is 44/44.

**Commit:** `feat: add page editor with autosave, publish and revisions`

---

### Task 5: Settings editors (master 4.5; R4-5)

**Files:** port
- `server/modules/settings/{routes,service}.ts` (extend Phase 3's `readPublishedSettings`) and the mount;
- `components/admin/settings/{settings-editor,settings-meta}.ts(x)` with CP keys;
- `app/(admin)/admin/(panel)/settings/{page.tsx,[key]/page.tsx}`. Integrations and AI are Phases 7 and 9.

**Tests:** port `settings-editor` DOM and the settings integration tests. Add:
- every CP editable key round-trips draft → publish → public read;
- marketing and customCode keys get 403 or 422 here, as SP does;
- `/admin/settings` lands on Site.

**Commit:** `feat: add settings and shared-section editors`

---

### Task 6: Services, collections, reorder (master 4.6; R4-3, R4-4)

**Files:** port
- `server/modules/{services,collections,reorder}/{routes,service}.ts` and the mounts, including `/testimonials`;
- `components/admin/{services,collections}/**` with the CP service-meta and the Testimonials config;
- `components/admin/sortable-list.tsx`;
- `app/(admin)/admin/(panel)/services/{page,new/page,[id]/page}.tsx`;
- `app/(admin)/admin/(panel)/collections/{page,team/page,clients/page,group-companies/page,testimonials/page}.tsx`.

The categories screen lives under Blog in Phase 5.

**Tests:** port the `services-screens`, `collections` and `service-slug-flush` DOM and integration tests. Add testimonials CRUD, reorder and invalidate tests, and a rating-bounds 422.

Port and adapt the e2e: create a service, publish it, and check it on `/services`. Clean up afterwards.

**Commit:** `feat: add services, collections and reorder screens`

---

### Task 7: Dashboard, Help, Activity, Users (master 4.7)

**Files:** port
- `server/modules/dashboard/*` and the mount;
- `components/admin/{dashboard,help,audit,users}/**`;
- `app/(admin)/admin/(panel)/{page.tsx,help/page.tsx,activity/page.tsx,users/{page,[id]/page}.tsx}`.

Use CP copy (R4-6).

**Tests:** port the DOM tests `dashboard`, `content-health`, `help-view`, `audit`, `users`, `permission-matrix` and `gauge`, plus the dashboard integration tests and e2e `users-audit.spec.ts`. Restore the deferred tests (R4-7).

**Acceptance:** the KPIs and Next-up render on seeded CP data. Help mentions only CP. Screenshot the dashboard and view it.

**Commit:** `feat: add dashboard, help, activity log and users screens`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```
