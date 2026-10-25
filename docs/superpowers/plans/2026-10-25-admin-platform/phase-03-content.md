# Phase 3: CP content model and public site from the DB

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 3.1–3.5). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (§6.2, §6.3, §6.4, O5, O6). Branch `feat/dynamic-platform`. Never push.

**Goal:** Every section of CP's public site renders from Postgres after `pnpm db:seed`. Every user-visible literal becomes a template field, a setting or a collection row (O6). The 40 Phase 0 baselines must stay at **0 px**.

This is CP-specific work. The **machinery** is ported from SP: the content schemas pattern, versioned tables, the seed runner, cached queries, `templates/shared/*`, the view/render split, and the TipTap renderer. The **content** comes from CP:
- CP's components;
- `lib/services.ts` and `lib/blog-posts.ts`;
- `docs/brief-inventory.json` (366 entries). Its sources are frozen at `3689369`, and `scripts/check-inventory.ts` reads them through `git show`.

**SP reference:**
- SP's `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-03-content.md` (Tasks 1–10) and its **Corrections** apply here unless a ruling below says otherwise. In particular:
  - media refs are `{ mediaId }` objects;
  - the seed is insert-only;
  - `getPage<K extends PageKey>`;
  - `<html lang>` stays static, with `SiteLocale` after hydration;
  - `sharp` is direct and external in the scripts bundle;
  - fixtures land early.
- SP's final-state files are the models for the machinery: `templates/shared/*`, `server/db/seed/*`, `server/modules/{pages,services,articles,collections,settings,media}/{repo,queries}.ts`, `lib/rich-text/*`, `server/modules/pages/sources.ts`, and `components/site-themed.tsx`.

## Global constraints for this phase

- The master Global Constraints apply in full: branding, sp→cp, port 5434, three env vars, a no-env build, the code boundaries, and the Playwright config kept.
- **0 px.** Every task that touches public rendering runs `pnpm test:visual` (40/40) before committing. The props refactor must not change any markup, class, attribute or text node. Reviewers diff the JSX.
- **O6 — nothing hard-coded.** After Task 3.8, `tests/unit/public-literals.test.ts` fails on any JSX text or string `alt`/`aria-label`/`title`/`placeholder`/`href`/`src` prop in a public component, and on module-level string arrays. The allowlist is punctuation and separators (`·`, `|`, `—`, `/`, `&nbsp;`) plus the CSS-only `data-*` values the motion code reads.
- **Inventory is the contract.** Each page's template schema leaf paths, each settings schema, and each collection schema must cover the inventory targets for that root. Port SP's `tests/unit/templates/inventory.test.ts`. Its `DERIVED` map lists CP's derived entries, and its normalisation handles CP's `seed`, `derived` and `template` keys. The test also asserts that template entries sharing a target have **equal seeds** (Phase 0 parked minor).
- **SP content never enters CP.** Copy, images, slugs and settings come only from CP sources. SP schema *shapes* are a model and are replaced wherever CP's design differs.
- Commits are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R3-1 — CP settings key set** (master Shared contracts).
  - The keys are `site`, `contact`, `navigation`, `footer`, `sections.clients`, `sections.whyChooseUs`, `sections.contact`, `sections.map`, `sections.team`, `sections.testimonials`, `sections.howItWorks`, `seo.defaults`, `consent`, `tracking`, `customCode`, `microcopy`, `leads` and `theme`.
  - Delete SP's `sections.enquireBanner` and `sections.about` schemas and every reference to them: `lib/admin/settings-keys.ts`, `growth-settings`, nav children, `PUBLIC_SETTINGS_KEYS`, cache tags and tests.
  - `leads` default recipients: `["info@cleaningpartners.ie"]` (B8).
- **R3-2 — Templates.** `TemplateName = "home" | "about" | "services" | "blog" | "contact" | "legal"`. Pages: `home, about, services, blog, contact, privacy→legal, terms→legal`. There is no `team` (B10).
  - `templates/registry.ts` replaces Phase 2's local `PAGE_KEYS` const in `lib/schemas/api/content.ts`, which goes back to importing `@/templates/registry` as in SP.
  - Re-add `@source not "../../../templates"` to `app/(admin)/admin/admin.css` (Phase 2 parked minor).
- **R3-3 — Collections.** These are SP's tables plus `testimonials`.
  - `testimonials` is migration `0021`: `id uuid v7, name text, initials text, quote text, rating int check 1..5 default 5, sort_order int, created_at, updated_at`. It follows the immediate-publish rules of SP's small collections, has `tag.testimonials`, and is guarded by `collection:*`.
  - `services` content jsonb uses **CP's shape**, from `lib/services.ts`: `title, icon, cover, summary, tags[], heroDescription, overviewTitle, overview[] (paragraphs), included[], places[]`, plus SEO.
  - Articles use SP's shape, with a TipTap body.
  - Categories are Medical, Commercial, Domestic, Education, Retail and ULV Fogging, each with `showInFilter`.
  - Group companies are seeded from CP's footer (Security Partners and MJS Eco), and the logo path is allowed by the branding gate.
- **R3-4 — Article bodies and renderer, moved here from master 5.2, as SP did.**
  - `lib/rich-text/render.tsx` turns TipTap JSON into CP's current `ArticleBody` markup:

    | CP block | TipTap node |
    |---|---|
    | `lead` | `paragraph` with attr `variant: "lead"` |
    | `h2` | `heading` level 2 |
    | `p` | `paragraph` |
    | `quote` | `blockquote` |
    | `checklist` | `bulletList` with attr `variant: "checklist"` |

  - There is one unit test per kind, plus 0 px on `/blog/5-signs-your-office-needs-a-professional-clean`.
  - The six articles without a body render exactly as today, using SP's nullable `lead`/`body`/`readTimeMinutes` rule adapted to CP's fields.
  - Phase 5 (master 5.2) builds the editor around this renderer and must not change its output.
- **R3-5 — 404s.** Keep Phase 2's `app/global-not-found.tsx`. Unknown service or article slugs call `notFound()` inside Suspense, which gives a soft 404 with noindex, as SP's Correction describes. Unmatched URLs keep the global 404, and the baseline holds.
- **R3-6 — Nav highlight.** `SiteHeader` matches the active link by **href** (current pathname, prefix for `/services/*` and `/blog/*`), never by label. Labels become editable. This must render identically to today.
- **R3-7 — Client components** (`BlogList`, `QuoteForm`, `ShareLinks`) receive every string as props from server views.
  - Keep `BlogList`'s behaviour exactly: category filter, `?q`, `PAGE_SIZE` from the blog template (`pageSize`, seeded 6), featured post only while browsing.
  - `QuoteForm` stays `mailto:` until Task 7.3, but its copy, options and mailto address come from data. The service options are the services collection plus template extras (`Domestic Cleaning`, `Other`).
- **R3-8 — Seeded harnesses.**
  - `tests/visual/seed.ts` runs `seedContent` after reset, as SP does, and the visual webServer now serves seeded content.
  - The entrypoint gains SP's auto-seed-when-empty step (`seedIfEmpty`).
  - `seed` is added to `SCRIPT_ENTRIES`, and `db:seed` to the scripts.
  - The deferred `scripts-bundle` seed/sharp test is restored here.
- **R3-9 — Deferred tests restored here.** These were deferred from Phases 1 and 2:
  - `interpolate.test` (group-companies, share-network, seeded hrefs; use **CP numbers**: office `057 8697670` Ext 4, mobile `085 806 2369`);
  - `link-rules` "keeps every seeded page and setting valid";
  - `settings.test`;
  - `site-header` DOM cases.

---

### Task 1: Content and settings schemas, settings fixtures (master 3.1, part 1)

**Files:**
- Modify: `lib/schemas/settings/*` (R3-1 key set; new `sections-{map,team,testimonials,how-it-works}.ts`; delete the enquire-banner and about schemas), `lib/schemas/settings/index.ts`, `lib/admin/{settings-keys,growth-settings,nav}.ts` and their tests.
- Create or modify: `lib/schemas/content/{service,article,category,client,group-company,team-member,testimonial}.ts` (CP service shape, R3-3).
- **Also in this task, so later phases don't hit traps** (Phase 2 final review, I1/I2):
  - Update `lib/admin/settings-keys.ts` (`EDITABLE_SETTINGS_KEYS`, labels and copy for the new CP keys; drop the SP keys and their SP copy), `PUBLIC_SETTINGS_KEYS`, and `tests/unit/admin/nav-registry.test.ts`.
  - Add a test that `EDITABLE_SETTINGS_KEYS ∪ {consent, tracking, customCode, seo.defaults, theme}` equals `SETTINGS_KEYS`.
  - Add `tag.testimonials` to `server/lib/cache-tags.ts`.
- Create: `server/db/seed/fixtures/{media,rich-text,settings}.ts`. Values come verbatim from the inventory and CP components, and `seed` templates use `{identifier}`.
- Test: port SP's `tests/unit/schemas/*` and `tests/unit/seed/settings-fixtures*.test.ts`, adapted. Add `tests/unit/schemas/testimonial.test.ts`. Restore `settings.test` (R3-9).

**Acceptance:**
- Every settings schema parses its fixture.
- Strings round-trip unchanged: en-dash in "Mon–Fri", "Mon – Fri" (spaced) kept distinct, apostrophes, `&`, `Ext 4`.
- No SP keys remain anywhere (`git grep -n "enquireBanner\|sections.about"` is empty outside docs).
- The branding gate passes.

**Commit:** `feat: add cp content and settings schemas with fixtures`

---

### Task 2: Content tables and migration 0021 (master 3.1, part 2)

**Files:**
- Modify: `server/db/schema/collections.ts` (add `testimonials`), `server/db/schema/index.ts`, and `server/db/schema/services.ts` (types only, now the CP `ServiceContent`).
- Create: `server/db/migrations/0021_*.sql` from `pnpm db:generate`, plus the meta.
- Modify: `server/lib/cache-tags.ts` (`tag.testimonials`) and `tests/integration/db.ts` `resetDb` (the table list, if it is explicit).
- Test: an integration test that migration 0021 applies and the `rating` check rejects 0 and 6.

**Acceptance:** `pnpm db:migrate` reaches 22 migrations, and `db:generate` afterwards reports "No schema changes".

**Commit:** `feat: add testimonials collection table`

---

### Task 3: Template schemas, registry and page fixtures (master 3.2)

**Files:**
- Create: `templates/registry.ts` (R3-2), `templates/{home,about,services,blog,contact,legal}/{schema,editor-meta}.ts`, `templates/editor-meta.ts` (port), `templates/shared/{editor-groups,page-meta,structured-data,consent}.ts` (port, rebranded; JSON-LD organisation details come from `settings` and are wired in Phase 8), `server/db/seed/fixtures/pages.ts`.
- Modify: `lib/schemas/api/content.ts`: delete the local `PAGE_KEYS` const and re-export it from the registry. Add a test that its keys equal the registry's 7 keys.
- Modify: `app/(admin)/admin/admin.css`: add `@source not "../../../templates"`. Add a test asserting the line exists.
- Test: `tests/unit/templates/inventory.test.ts` (port, CP `DERIVED`, seed equality), `tests/unit/templates/registry.test.ts`, `tests/unit/templates/fixtures.test.ts`, and `tests/helpers/schema-paths.ts` (port).

The **page field sets** come from spec §6.2 and the inventory:
- **home:** hero; services intro; blog (heading, cta, count 3).
- **about:** page hero; Our Story (eyebrow, title, paragraphs[], sectors heading, sectors[], 2 images with alt, cta); stats[4].
- **services:** page hero; grid heading and intro; "Not sure" card.
- **blog:** page hero; featured article; filter labels; search placeholder; pageSize 6; empty-state copy; pagination labels.
- **contact:** page hero; contact title override "Ways to Reach Us"; quote form (heading, intro, next steps[], urgent box, every label, placeholder and option, extras `Domestic Cleaning`/`Other`, button, consent label, mailto recipient).
- **legal:** SP's legal template.
- Shared sections are settings, not page fields. The `seo` of each page sits in `pages.<key>.seo`, outside the template.

**Acceptance:**
- The inventory test passes for every root: pages, services[], articles[], each collection, and every settings key.
- The fixtures parse.
- Registry paths: `/`, `/about`, `/services`, `/blog`, `/contact`, `/privacy`, `/terms`.

**Commit:** `feat: add cp page templates, registry and page fixtures`

---

### Task 4: Collection fixtures and static media reader (master 3.3)

**Files:**
- Create: `server/db/seed/fixtures/{services,articles,categories,team,clients,group-companies,testimonials,sources,index}.ts`, `server/db/seed/media.ts` (port `readStaticMedia`; `sharp` is a direct dep, as SP has it).
- Media: every `public/images/**` file that content uses gets a `driver:"static"` row with width, height and blur.
- Articles: bodies are TipTap JSON, using the R3-4 mapping. Only "5-signs…" has a full body; the other six follow the nullable rule.
- Test: port SP's `tests/unit/seed/*fixtures*.test.ts`. Add one assertion that article bodies use only nodes the renderer supports.

**Acceptance:** fixtures typecheck against the schemas, media dimensions match the files, and static URLs equal today's `/images/...` paths.

**Commit:** `feat: add cp collection fixtures and static media reader`

---

### Task 5: Seed runner and `db:seed` (master 3.4, part 1)

**Files:**
- Create (port): `server/db/seed/index.ts` (`seedContent`, `seedIfEmpty`, `SEED_TABLES` including testimonials), `scripts/seed.ts`, `server/lib/media-usages.ts` (closure).
- Modify: `package.json` `db:seed`, `scripts/build-scripts.ts` (`seed` entry, sharp external), `docker-entrypoint.sh` (auto-seed-when-empty, R3-8), `tests/visual/seed.ts`, `tests/e2e/seed.ts` (`seedContent`).
- Test: port SP's `tests/integration/seed/*.test.ts` and restore the `scripts-bundle` seed case.

**Acceptance:**
- Seeding twice gives the same counts (insert-only).
- Seeded records are published with version 1.
- Fixture strings round-trip unchanged.
- `seedIfEmpty` is a no-op on a non-empty DB.

**Commit:** `feat: add seed runner and db:seed`

---

### Task 6: Repos, cached queries, cache tags, Cache Components (master 3.4, part 2)

**Files:**
- Create (port): `server/modules/{pages,services,articles,collections,settings,media}/{repo,queries}.ts`, with testimonials added to collections (`listTestimonials`).
- Modify: `next.config.ts` (`cacheComponents: true`), `server/modules/theme/queries.ts` (`"use cache"` + `cacheLife` + `cacheTag(tag.settings("theme"))` on `getPublishedTheme`, Phase 2 deferral), and the admin routes that need Suspense fixes (SP Task 6 Step 5).
- Test: port SP's repo-only lint boundary test and the query integration tests.

**Acceptance:**
- An unknown slug gives `null`.
- Queries read `published`.
- The no-env build passes with `cacheComponents`.
- `pnpm test:e2e` still passes, because the admin routes still work.
- Visual stays 40/40. Public pages still use static data in this task.

**Commit:** `feat: add content repos and cached queries`

---

### Task 7: Render helpers and TipTap renderer (R3-4)

**Files:**
- Create (port and adapt): `lib/rich-text/{render.tsx,…}` with the CP markup mapping. Modify `lib/interpolate.ts` if needed.
- Test: a renderer test per node kind against the exact markup of today's `ArticleBody`, and `interpolate.test` restored with CP numbers (R3-9).

**Commit:** `feat: add cp article renderer and render helpers`

---

### Task 8: Props-driven components, templates and pages (master 3.4)

**Files:**
- Modify every public component in `components/{home,about,services,blog,contact}` so that it takes props, with markup unchanged. That covers header (R3-6), footer, hero, page-hero, clients, services, why-choose-us, testimonials, team, blog, contact, location-map, quote-card, our-story, stats, services-grid, service-overview, how-it-works, blog-list, post-card, article, related-posts, share-links and quote-form.
- Create: `templates/shared/{sources,views}.ts`, `templates/{home,about,services,blog,contact}/{view.ts,render.tsx}`, service-detail and article views (in `templates/services`/`templates/blog` or `shared`; follow SP), `server/modules/pages/sources.ts` (interim, fixture-backed per SP's Correction), and `components/site-locale.tsx` and `components/site-themed.tsx` (port).
- Modify: every `app/(site)/**/page.tsx` to use `loadSiteSources()`, view and render, with `generateMetadata` via `pageMetadata`.
- Delete: `lib/services.ts`, `lib/blog-posts.ts`.
- Test: `tests/unit/public-literals.test.ts` (new, O6), `tests/unit/no-data-modules.test.ts`, `tests/unit/templates/views.test.ts`, and site-header DOM cases for the href-based active state.

**Acceptance:**
- `pnpm test:visual` 40/40 at 0 px, still backed by fixtures.
- `public-literals` passes.
- The JSX diff is only prop plumbing.

**Commit:** `refactor: drive public components from template views`

---

### Task 9: Public pages read the database; seeded visual gate

**Files:**
- Modify: `server/modules/pages/sources.ts` (load from the queries, not the fixtures).
- Test: the seeded visual gate, plus an integration test that a published edit to `pages.home.hero` shows through `loadSiteSources` after cache invalidation.

**Acceptance:**
- The webServer resets and seeds `cp_e2e`, then serves.
- `pnpm test:visual` passes 40/40 at **0 px** against the Phase 0 baselines.
- An unknown slug gives the 404 UI.
- A DB-down case gives `error.tsx` styled with the site's look (`app/(site)/error.tsx`, ported).

**Commit:** `feat: render public pages from the database`

---

### Task 10: Legal pages, footer legal links, public-site E2E

**Files:**
- Create: `app/(site)/{privacy,terms}/page.tsx` (legal template; placeholder legal copy marked for owner review, B9), and fixtures for them.
- Modify: the footer legal links seed, which changes `#` to `/privacy` and `/terms`. This is an href-only change, so pixels are unchanged.
- Test: `tests/e2e/public-site.spec.ts` (port, CP URLs). It checks that every public URL returns 200 with no console errors, that GSAP motion reaches its final state, and that `/privacy` and `/terms` render. Add visual baselines **only** for `/privacy` and `/terms` (new pages; keep the 40 existing ones untouched) via `--update-snapshots` scoped to those two names, then commit.

**Acceptance:** E2E passes, the 40 original baselines are unchanged at 0 px, and the 4 new legal baselines are committed.

**Commit:** `feat: add privacy and terms pages and public-site e2e`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
node scripts/check-inventory.ts 2>/dev/null || pnpm dlx tsx scripts/check-inventory.ts
```
