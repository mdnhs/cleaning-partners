# Admin Platform Implementation Plan (Master)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Cleaning Partners exactly Security Partners' admin panel and backend, with every section of CP's frozen Figma-built public site editable from the database, and no pixel of the public site changed.

**Architecture:** One Next.js 16.3.8 app, same layering as SP: public site in `app/(site)` renders fixed templates from Postgres through cached `queries`; admin in `app/(admin)/admin`; Hono API at `app/api/[...route]`; server code under `server/` (routes → service → repo). Admin and backend code is **ported from SP at `1a9f65d`** and rebranded; CP's existing public components become the template and block views; SP's public components are never ported.

**Tech Stack:** SP's exact pinned versions (copy from `/Users/nazmulhasansourab/ireland/security-partners/package.json`). Includes Next.js 16.3.8, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.3, Hono 4.13.13, Better Auth 1.7.10, Drizzle 0.45.4 / drizzle-kit 0.31.11, pg 8.23.1, Postgres 17.11, Zod 4.6.7, TanStack Query 5 / Table 9, TipTap 3.32.0, dnd-kit, React Email 6.11.2, nodemailer 10.0.14, AWS SDK S3, sharp 0.35.5, AI SDK `ai` 7.0.127, Vitest 5.0.5, and Playwright 1.64.1.

**Spec:** `docs/superpowers/specs/2026-10-25-admin-platform-design.md`. Read it fully before any task; § and O/B numbers below refer to it.

**Reference implementation (read-only, never modify):** `/Users/nazmulhasansourab/ireland/security-partners` ("SP"). Before porting anything, check that `git -C <SP> rev-parse --short HEAD` prints `1a9f65d`. SP's own docs explain why the code is the way it is:
- `docs/superpowers/specs/*`
- `docs/superpowers/plans/**`, which includes the phase plans with full TDD steps for every subsystem being ported
- `docs/superpowers/notes/{nextjs-16-api,libraries-api}.md`
- `docs/runbook.md`

Copy the two notes files into this repo in Task 1.1. They are the API ground truth, together with `node_modules/next/dist/docs/`.

## How this plan is structured (rolling-wave)

This master plan fixes the phases and each task's files, interfaces and acceptance. Each phase builds on code the previous phase produced, so the bite-sized TDD steps for a phase live in a **phase plan**, written just before that phase starts:

```
docs/superpowers/plans/2026-10-25-admin-platform/phase-00-baselines.md   (written now)
docs/superpowers/plans/2026-10-25-admin-platform/phase-01-core.md
...
docs/superpowers/plans/2026-10-25-admin-platform/phase-11-launch.md
```

A phase plan may not change a task's Interfaces or acceptance without a dated "Change" note appended to this file.

**Porting rule ("port" in this plan means all of this):**
1. Copy the SP file(s) and their SP tests verbatim.
2. Apply the branding map (Global Constraints).
3. Adapt only what CP's content model forces.
4. Keep SP's tests, adjusted for CP values.
5. Name in the report every behavioural difference from SP. There should be none, other than branding and CP content.

SP's phase plans already hold the TDD steps for ported code. A CP phase plan points to them and lists only the CP deltas and CP-specific tests.

## Global Constraints

**Public design and content**
- The public design is frozen (O5). Every URL in `tests/visual/urls.ts` must stay at **0 px** against the Phase 0 baselines, at 1440×900 and 390×844, animations off, on this macOS machine.
  - From Phase 3 on, the comparison runs after seeding.
  - Any task that touches any of these runs `pnpm test:visual` before committing: `app/(site)/**`, non-admin `components/**`, `templates/**`, `blocks/**`, `lib/seo/**`, `lib/analytics/**`, `proxy.ts`, `app/globals.css`, `next.config.ts`.
- Every public section is dynamic (O6). After Phase 3, no user-visible literal remains in a public component: no text, image src, alt, href, tel/mailto, list item or aria label.
- SP is followed for the admin and backend only (O4). Never port these: `components/{home,about,services,blog,contact}` from SP, SP `templates/*/render.tsx` views, or SP blocks `iconCards`, `enquireBanner`, `departments`.

**Configuration and branding**
- Env vars are exactly `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, plus platform `NODE_ENV`, `PORT`, `HOSTNAME`. No new env vars, ever.
- `next build` must pass with no env and no DB: `env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build`.
- **Branding map.** Apply on every port. Content and docs included.

  | SP | CP |
  |---|---|
  | Security Partners | Cleaning Partners |
  | `security-partners` | `cleaning-partners` |
  | `securitypartnersltd.com` | `cleaningpartners.ie` |
  | `security.raynx.ie` | `cleaning.raynx.ie` |
  | cookie prefix `sp` | `cp` |
  | HKDF salt `sp/v1` | `cp/v1` |
  | dbs `sp_dev`/`sp_test`/`sp_e2e`, role `sp` | `cp_dev`/`cp_test`/`cp_e2e`, role `cp` |
  | R2 key prefix `sp` | `cp` (same bucket, O7) |
  | `SP_R2_*` | `CP_R2_*` |
  | `lib/theme/sp-admin.ts` / `SP_ADMIN` | `lib/theme/cp-admin.ts` / `CP_ADMIN` |
  | preset `security-partners` | `cleaning-partners` |
  | compose project `security-partners-dev` | `cleaning-partners-dev` |
  | admin section "Insights", `/admin/insights/*` | "Blog", `/admin/blog/*` (B2) |

  The only allowed "Security Partners" strings are the group-companies fixture row and docs that cite the SP reference repo. `tests/unit/branding.test.ts` (Task 1.1) enforces this.
- **Dev services run beside SP's.**
  - Postgres listens on `127.0.0.1:5434`.
  - Mailpit SMTP listens on `127.0.0.1:1026`, UI on `127.0.0.1:8026`.
  - The Playwright port is 3200.

**Code boundaries** (same as SP)
- Every `server/**` file starts with `import "server-only"`.
- `lib/**`, `blocks/**` and `templates/*/schema.ts` never import `server/**`.
- Only repos and `server/db/**` import drizzle query builders.
- Hono handlers run `zv` → `can()` → service. Services re-check permissions and `writeAudit` every mutation.

**Data and API** (same as SP)
- uuid v7 ids.
- `timestamptz`; ISO 8601 UTC on the wire; displayed in `Europe/Dublin` / `en-IE`.
- Error envelope `{ error: { code, message, fieldErrors?, current?, requestId } }`.
- Lists return `{ items, page, pageSize, total }`, with `pageSize` ≤ 100.

**Migrations**
- SP's `server/db/migrations/0000`–`0020` and `meta/` are ported verbatim in Task 1.3. This keeps their custom SQL; 0017/0020 add then remove the newsletter, which is harmless.
- CP migrations start at `0021`. A task that adds one runs `pnpm db:generate` and commits the journal.

**Dependencies**
- Exact SP versions only. Adding a dep SP does not have needs a dated Change note here.

**Process**
- Only one agent at a time runs Playwright or `next build`.
- Prettier: run `pnpm exec prettier --write <files>` on touched files. Never on `app/globals.css`, which has a pre-existing warning that must stay.
- Read `node_modules/next/dist/docs/` before writing framework code (AGENTS.md).
- Branch `feat/dynamic-platform`, created from `main` at `3689369`.
  - Commit after every task, staging only your paths.
  - Commit messages are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - **Never `git push`, never merge to `main`.** `main` auto-deploys to Dokploy. Cut-over is the owner's call (B11).
- Every phase ends green: `pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual`. From Phase 2, `&& pnpm test:e2e` is added. Run `pnpm db:up` first.

## Review Focus

1. **SP leftovers slipping in during a port.** Watch for:
   - names, domains or emails
   - the `sp` cookie, salt, db or R2 prefix
   - SP's green palette in the admin
   - SP copy in Help, emails, OG cards or JSON-LD

   Each would ship Security Partners branding on CP's admin or emails. Pinned by `tests/unit/branding.test.ts` (Task 1.1). It scans every tracked text file except an explicit allowlist and runs in `pnpm test` on every task.
2. **R2 work touching SP's objects in the shared bucket** (O7): a list, prune, delete or backup-retention call without the `cp/` prefix could delete SP's media or backups. Pinned by unit tests in Task 6.1 and Task 11.1:
   - every key the R2 driver puts or deletes starts with `cp/`
   - every `ListObjectsV2` call passes `Prefix` starting with `cp/`
   - backup pruning never sees a key outside `cp/backups/`
3. **CP article bodies losing markup when converted to TipTap.** CP's `ArticleBlock` union is `lead | h2 | p | quote | checklist`; a checklist or lead paragraph silently becoming a plain `<p>` would be a regression. Pinned by Task 5.2: a renderer unit test per block kind, and the 0 px visual gate on `/blog/5-signs-your-office-needs-a-professional-clean`.
4. **Quote-form submissions with values outside the services collection.**
   - "Domestic Cleaning" and "Other" are not services but must be accepted.
   - An unknown service string must get a 422 field error.
   - A blank optional address/Eircode must be stored as null, not "".

   Pinned by integration tests in Task 7.3.
5. **A public component quietly keeping a hard-coded literal** after Phase 3 breaks O6: the owner edits a field and the page does not change. Pinned by `tests/unit/public-literals.test.ts` (Task 3.4). It parses every public component's TSX and fails on JSX text, string `alt`/`aria-label`/`href`/`src` props, and string-array module constants. Allowlist: punctuation and the separators listed in the test.

---

## Shared contracts (CP deltas over SP's; everything else is SP's contract verbatim)

```ts
// lib/schemas/settings/index.ts — CP key set (O6: a section rendered on more than one page is a global)
export const settingsSchemas = {
  site, contact, navigation, footer,
  "sections.clients",        // home, about, services
  "sections.whyChooseUs",    // home, about, services
  "sections.contact",        // home, about, services, contact (title overridable per page)
  "sections.map",            // home, contact
  "sections.team",           // home, about (heading; members are the team collection)
  "sections.testimonials",   // home, about, services (heading; items are the testimonials collection)
  "sections.howItWorks",     // every /services/[slug]
  "seo.defaults", consent, tracking, customCode, microcopy, leads,
  theme,
}
// SP keys NOT in CP: "sections.enquireBanner", "sections.about"

// templates/registry.ts
export type TemplateName = "home" | "about" | "services" | "blog" | "contact" | "legal"
// page keys: home, about, services, blog, contact, privacy, terms   (no "team", B10)

// collections (server/db/schema/collections.ts gains, migration 0021)
testimonials: { id, name, initials, quote, rating /* 1..5 */, sortOrder, createdAt, updatedAt }
// cache tag: tag.testimonials = "testimonials"; permission: collection:* (same as team/clients)

// blocks/registry.ts — CP block library (O4), each view = a CP component
type BlockType = "hero" | "hero.page" | "ourStory" | "stats" | "services" | "whyChooseUs" | "clients"
  | "team" | "testimonials" | "blog" | "howItWorks" | "contact" | "quoteForm" | "map" | "richtext"

// lib/theme/cp-admin.ts
export const CP_ADMIN: { light: Record<AdminToken, string>; dark: Partial<Record<AdminToken, string>>; radius: 0.75 }
// lib/theme/presets.ts: preset id "cleaning-partners" is the default admin preset

// server/lib/storage/r2.ts
export const R2_PREFIX = "cp/"   // every key; keys never built elsewhere
```

---

## Phases and tasks

### Phase 0: Baselines and inventory (phase plan written)

| Task | Title | Acceptance |
|---|---|---|
| 0.1 | Field inventory + brief | `docs/brief-inventory.json` covers every user-visible literal in `app/**` and `components/**`, each with a target under the CP roots above. `scripts/check-inventory.ts` passes. `docs/brief.md` written for CP. |
| 0.2 | Visual baseline harness | Baselines for every `PUBLIC_URLS` entry at desktop and mobile, from a static build of `3689369`. `pnpm test:visual` passes twice in a row at 0 px. |

### Phase 1: Platform core

| Task | Title | Files (port from SP unless noted) | Acceptance |
|---|---|---|---|
| 1.1 | Deps, tooling, boundaries, branding gate | `package.json` (all SP deps + scripts, `name` stays `cleaning-partners`), `pnpm-workspace.yaml`, `tsconfig.json` (ES2022, exclude `scripts/dist`), `eslint.config.mjs`, `vitest.config.ts`, `tests/stubs/server-only.ts`, `tests/unit/setup.ts`, `tests/dom/setup.ts`, `tests/unit/{lint-boundaries,server-only-guard}.test.ts`, `scripts/register-server-only.mjs`, `docs/superpowers/notes/*`. **New:** `tests/unit/branding.test.ts`. | Lint-boundaries test fails on a `lib/` → `server/` import. The branding test fails on an injected "securitypartnersltd.com" and passes on the tree. `pnpm test` is green. |
| 1.2 | Env, errors, crypto, actor, ids, site env/origin | `server/env.ts`, `server/lib/{errors,crypto,actor,site-env,site-origin,ip,internal-signature}.ts`, `lib/{ids,json,format,interpolate,hidden-chars,href,link-rules,request-path,utils}.ts`, and their SP unit tests | SP's unit tests pass with the `cp/v1` salt. `tests/unit/crypto.test.ts` asserts a token made with salt `sp/v1` does **not** decrypt. |
| 1.3 | DB, migrations, dev services | `docker-compose.dev.yml` (ports 5434/1026/8026, db names `cp_*`), `docker/postgres-init.sql`, `drizzle.config.ts`, `server/db/{client,migrate,like}.ts`, `server/db/schema/**`, `server/db/migrations/0000–0020 + meta`, `scripts/migrate.ts`, `tests/integration/{db,setup,global-setup}.ts`, `tests/unit/{db-client,migrate-unlock,pg-errors}.test.ts`, `.env.example` | `pnpm db:up && pnpm db:migrate` applies 21 migrations to `cp_dev`. Integration `select 1` passes on `cp_test`. SP's dev stack can run at the same time. |
| 1.4 | Hono skeleton + health | `app/api/[...route]/route.ts`, `server/api/{app,context,validate}.ts`, `server/api/middleware/*`, `server/modules/health/routes.ts`, `server/lib/{rate-limit,pg-errors}.ts`, `server/modules/rate-limit/repo.ts`, SP api unit and integration tests | `GET /api/v1/health/live` returns 200. `/api/v1/health` returns 503 when the DB is unreachable. Unknown route returns a 404 envelope with `requestId`. |
| 1.5 | Docker, entrypoint, standalone, CI | `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml` (keep service `cleaning-web` and image `ghcr.io/mdnhs/cleaning-partners`; add env + `/data` volume + Postgres service as SP), `scripts/{build-scripts.ts,prepare-standalone.mjs}`, `instrumentation.ts` (scheduler start guarded until Phase 5), `next.config.ts` (SP headers, standalone, `poweredByHeader:false`; **no** `ADMIN_LEGACY_REDIRECTS`, since CP has no legacy admin URLs; `cacheComponents` waits for Task 3.5), `.github/workflows/ci.yml` (`deploy.yml` unchanged until Task 11.4) | `docker build .` passes with no args. The container, given the 3 env vars and dev Postgres, migrates and then serves health 200. Public pages still match the baselines at 0 px. |

### Phase 2: Auth, RBAC, users, audit, admin chrome base

| Task | Title | Acceptance |
|---|---|---|
| 2.1 | Roles + permissions (`lib/auth/*`) | SP's permission matrix test passes unchanged; testimonials is covered by `collection:*`. |
| 2.2 | Auth schema + Better Auth (`server/auth/*`) | Cookie names start with `cp`. Sign-up is disabled. Passwords need ≥ 12 chars. 7-day sessions. 2FA. Impersonation. SP's auth integration tests pass. |
| 2.3 | Audit + session DAL + Hono auth middleware | SP's tests pass: 401/403 paths and audit rows written on sign-in. |
| 2.4 | Users module + invite/reset emails | Invite returns `inviteUrl` when SMTP is unset. Rules: last owner protected, impersonation limits. Emails carry CP branding (logo `public/images/home/logo.png`). |
| 2.5 | Admin root layout, admin CSS, CP preset, auth pages, `proxy.ts` | `lib/theme/cp-admin.ts` is derived from the CP brand tokens (spec B4) and passes SP's contrast checks. Sign-in, 2FA, set/reset/forgot password screens. `/admin` without a session redirects to sign-in. `X-Robots-Tag: noindex` on `/admin` and `/api`. |
| 2.6 | Account security + bootstrap scripts | `admin:create`, `owner:recover`, `demo:seed`, seed guard. SP's tests pass. |

### Phase 3: CP content model and public site from the DB (CP-specific)

| Task | Title | Acceptance |
|---|---|---|
| 3.1 | Content + settings schemas | Port `lib/schemas/**` and replace the settings key set with CP's. Add the testimonials table (migration 0021) and Zod schema. Every settings schema parses its fixture. No whitespace normalisation. |
| 3.2 | Template schemas + editor-meta | `templates/{home,about,services,blog,contact,legal}/{schema,editor-meta,view}.ts` and `templates/registry.ts`. The template machinery (`templates/shared/*`, `templates/editor-meta.ts`) is ported. A test asserts that each page's schema leaf paths equal that page's inventory targets. |
| 3.3 | Fixtures, media seed, seed runner, queries | Fixtures copied verbatim from CP components and `lib/{services,blog-posts}.ts`. Article bodies become TipTap JSON (lead/quote/checklist mapping fixed in Task 5.2's renderer; seed uses it). Media rows use `driver:"static"`. Seeding twice gives the same counts. Queries return `null` for unknown slugs. |
| 3.4 | Route groups + props-driven components | `app/*` moves to `app/(site)/*`. Every CP public component takes props. `lib/services.ts` and `lib/blog-posts.ts` are deleted. `tests/unit/public-literals.test.ts` passes (Review Focus 5). The markup diff is prop plumbing only. |
| 3.5 | Public pages from DB, caching, metadata, legal, 404/error | `cacheComponents: true`. Pages read queries inside `<Suspense>` after `connection()`, so the build needs no DB. `/privacy` and `/terms` use the legal template. Footer legal links change `#` → `/privacy`, `/terms`. Unknown slug returns 404. **Visual gate 0 px after seed.** |

### Phase 4: Admin shell and editors (port + CP wiring)

| Task | Title | Acceptance |
|---|---|---|
| 4.1 | Shell, providers, nav registry, ⌘K, permission hook, search | `lib/admin/nav.ts` uses SP's items, with Insights → "Blog" at `/admin/blog`. Collections adds Testimonials. SP's DOM and unit tests pass with the renamed labels. |
| 4.2 | Versioning, revisions, preview, pages API | SP's tests pass, including the stale-version 409. |
| 4.3 | SchemaForm + widgets | Renders every CP template schema without a missing widget. |
| 4.4 | Page editor screen | E2E: edit the home hero heading → publish → `/` shows it. |
| 4.5 | Settings editors | Every CP settings key is editable with draft/publish. Marketing and customCode are rejected here. |
| 4.6 | Collections + services editor + reorder | Services carry CP fields (summary, tags, heroDescription, cover, overview, included, places, icon, SEO). Testimonials CRUD + reorder invalidates `testimonials`. |
| 4.7 | Dashboard, Help (CP copy), Activity, Users screens, Account | SP's DOM tests pass. Help text is rebranded. |

### Phase 5: Blog workflow

| Task | Title | Acceptance |
|---|---|---|
| 5.1 | Articles service + API | SP's rules: author submit, editor publish/schedule, 403s, 409, readTime. |
| 5.2 | TipTap editor + CP renderer | `lib/rich-text/render.tsx` outputs CP `ArticleBody` markup. Mapping: `lead` → paragraph with mark/attr `lead`; `quote` → blockquote; `checklist` → bulletList with attr `variant:"checklist"`. One unit test per kind. 0 px on the 5-signs article (Review Focus 3). |
| 5.3 | Blog admin screens at `/admin/blog/*` | List, editor, review queue, categories with `showInFilter`. Schedule shown in Europe/Dublin time. |
| 5.4 | Scheduler + jobs | `instrumentation.ts` starts the scheduler. A due article is published exactly once under concurrent ticks. |

### Phase 6: Media

| Task | Title | Acceptance |
|---|---|---|
| 6.1 | Storage drivers | Disk fallback when R2 is unset. R2 driver: `R2_PREFIX = "cp/"` on put, delete, list and url (Review Focus 2). |
| 6.2 | Media service, upload API, file route | SP's MIME sniffing, SVG sanitising, usage tracking, 409 on in-use delete. |
| 6.3 | Media library UI + picker | Changing the hero image in the page editor changes the public page after publish. |
| 6.4 | Migrate-to-R2 job | Idempotent. Skips `static` media. |

### Phase 7: Integrations, email, leads

| Task | Title | Acceptance |
|---|---|---|
| 7.1 | Integrations module + screens | Secrets are write-only and encrypted. `test` endpoint for each integration. |
| 7.2 | Mailer + lead emails | Lead notification goes by default to `info@cleaningpartners.ie` (B8). Mailpit runs on 1026 in dev. CP-branded templates. |
| 7.3 | Public leads endpoint + quote form wiring | `components/contact/quote-form.tsx` posts to the leads API instead of `mailto:`. Fields: name, phone, email, service (services collection + "Domestic Cleaning" + "Other"), address/Eircode, message, consent `true`. Honeypot doesn't change layout. Rate limit and Turnstile as SP. Review Focus 4 tests. 0 px on `/contact`. |
| 7.4 | Leads inbox, board, drawer, CSV, retention | SP's tests pass. Retention 24 months. |

### Phase 8: SEO and marketing

| Task | Title | Acceptance |
|---|---|---|
| 8.1 | SEO fields, metadata, JSON-LD, OG, SeoPanel, SEO overview + checks | JSON-LD organisation is Cleaning Partners Ltd with the CP contact details. OG cards use CP logo and colours. Lighthouse SEO is 100 on `/`. |
| 8.2 | Sitemap, robots, redirects (+ CSV) | SP's tests pass. Sitemap lists CP URLs. |
| 8.3 | Consent, tracking, custom code, events | Tracking is off by default: no banner and 0 px. Owner-only rules as SP. |

### Phase 9: Appearance, Design, AI assistant

| Task | Title | Acceptance |
|---|---|---|
| 9.1 | Theme engine + storage + runtime | The default public theme emits no `<style>` (B5). Equality tests compare `CP_ADMIN` with admin.css and the default site tokens with `app/globals.css`. |
| 9.2 | Appearance + Design screens | Preset gallery with `cleaning-partners` first. Autosave, conflict and history as SP. |
| 9.3 | AI settings, providers, tools, chat panel | SP's tests pass. The prompt names Cleaning Partners. Enquiry-details switch is owner-only and off by default. |

### Phase 10: Page builder

| Task | Title | Acceptance |
|---|---|---|
| 10.1 | Block machinery + CP block library | `blocks/{define-block,document,fields,media-refs}.ts` ported. `blocks/registry.ts` holds exactly the 15 CP `BlockType`s, each rendering the CP component. Block library test lists them. |
| 10.2 | `builder_pages` data, service, API | SP's tests pass, including the stale-version 409. |
| 10.3 | Public `/p/[slug]` render, sitemap, OG, preview | The visual fixture page renders every block. Baselines added for `/p/visual-fixture`. |
| 10.4 | Builder UI + "copy fixed page" | E2E: create a page from blocks, publish, view it. |

### Phase 11: Hardening, ops, E2E, launch

| Task | Title | Acceptance |
|---|---|---|
| 11.1 | Ops scripts | `backup`, `restore-drill`, `secrets:rotate`, `db:sync`, `custom-code:off`, `r2:bootstrap` (`CP_R2_*`), `data:import`, `data:export-to-r2`. R2 prefix tests (Review Focus 2). |
| 11.2 | Security pass | SP's security tests: same-origin, headers, log secret scan, dependency audit. |
| 11.3 | E2E suite + admin visual baselines | SP's e2e specs ported for CP content. Admin screens re-shot. |
| 11.4 | CI + deploy gating | `deploy.yml` runs only on CI success for `main`. It stays dormant until the owner merges. |
| 11.5 | Docs + cut-over checklist | `docs/{brief,runbook,launch}.md` for CP. The launch doc lists the owner steps in spec §10 in order. Definition of done verified with captured output. |

**Phase order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11.
- 3 must precede 4: editors need CP templates.
- 5.2's renderer is needed by 3.3's article fixtures. Task 3.3 writes the renderer's mapping table; 5.2 builds the editor around it.

## Self-review record (2026-10-25)

Spec coverage:

| Spec | Tasks |
|---|---|
| §2.1 | Phases 1, 2, 4–11 |
| §2.2 / §6.4 | 0.2 and the 0 px gates |
| §2.3 / §6.2 / §6.3 | 3.x, 4.x, 10.x |
| §2.4 / O1 / O7 | branding map, 1.3 dev db names, 6.1 |
| §5 B1–B12 | Global Constraints, 1.5, 2.5, 3.5, 7.2, 9.1, 11.4 |
| §6.5 | 7.3 |
| §6.6 | branding map + 1.1 |
| §8 phases | Phases 0–11 (spec phase 10 split into 10 builder + 11 hardening) |
| §10 | 11.5 |

Type consistency: the CP names in Shared contracts are reused by phase plans.

## Changes

- 2026-10-25 (Phase 0 outcome):
  - **Playwright.** The config differs from SP's in three ways, and every later phase must keep all three: `use.channel: "chromium"` (the 40 baselines were shot with full Chromium; dropping it moves pixels), port env `PW_PORT` with default 3200, and a standalone webServer (`pnpm build && node scripts/prepare-standalone.mjs && node .next/standalone/server.js`, because `next start` refuses `output: "standalone"`). `scripts/prepare-standalone.mjs` already exists, byte-identical to SP's. Phase 2 must set `testMatch` per project, replacing the global one.
  - **Inventory.** It is frozen at baseline `3689369`. `scripts/check-inventory.ts` reads sources via `git show 3689369:<file>`, so it survives Phase 3.4's file moves.
  - **Inventory schema.** Entries may carry `array` (list entries) and `seed`, the SP-`interpolate` form of a template value such as `"Tel: {office} Ext 4"`. Consumers ignore unknown keys.
  - **Page SEO** targets are `pages.<key>.seo.*`. Service and article titles come from `settings.seo.defaults.titleTemplate` (SP contract).
  - **Shared-section page lists:** `sections.whyChooseUs` and `sections.testimonials` also render on `/services/[slug]`, and `sections.contact` renders on all 7 routes.
  - **Nav highlight.** `SiteHeader active=…` matches by label today. Task 3.4 switches it to match by href, so renaming a label can't break the highlight.

  - **Branding map extension (Phase 1).** Every `sp`-prefixed identifier becomes `cp`: internal headers `x-sp-*` → `x-cp-*`; events `sp:consent` / `sp:navigate` → `cp:*`; cookie and storage keys `sp_consent` / `sp_attribution` → `cp_*`; window and global names `__sp*` → `__cp*`. The CP dev Postgres port is **5434**, because 5433 is taken locally. `tests/unit/branding.test.ts` forbids all of these.

  - **Phase 1 outcome.** `instrumentation.ts` moves from Task 1.5 to Task 5.4 (phase-01 R5). The public route-group move (`app/*` → `app/(site)/*`) moves from Task 3.4 to Task 2.5a: Next allows a separate `/admin` root layout only when there is no `app/layout.tsx`. Task 3.4 keeps only the props-driven work. The CI `image` smoke job is deferred to Task 11.4.

  - **Phase 2 outcome.** The TipTap renderer moves from Task 5.2 to Phase 3 (phase-03 R3-4). Items for later phases:
    - **6.1:** `server/lib/r2-client.ts` `r2ObjectKey` must force the `cp/` root regardless of the user-configurable `keyPrefix` (default `""`), with the Review Focus 2 tests.
    - **9.1:** `lib/theme/checks.ts` `SITE_PAIRS` must include white text on `brand`.
    - **4.1:** restore SP's impersonation banner and stop control in the panel shell. Delete the temporary `sign-out-control.tsx` and the header Account link. Restore the deferred user-menu tests.
    - **3.x/3.10:** if the global 404 moves to SP's `(site)/[...notFound]` catch-all, drop `app/global-not-found.tsx`'s internal `next/dist` import.

  - **Phase 4 outcome (Task 6).** Task 8.2 must restore `recordMove` in `server/modules/services/service.ts` `changeServiceSlug` and `deleteService` (markers at `:189` and `:223`). It must also restore the `"redirects"` tag assertion in `tests/integration/api/collections.test.ts`, which has an `it.todo` marker. Until then, a renamed or deleted published service 404s at its old URL. **Don't cut over before 8.2.** Task 8.1 restores the SEO tab in the page and service editors (SeoPanel).

  - **Phase 4 outcome (final).** Deferrals by owning phase:
    - **6:** port the media library, R2 driver and migrate. Restore `getStorage(db)` / `storageFor(driver, db)` and `migrateDiskMediaToR2` plus the migration-status functions. Fix the stale R2 comments and `deleteStoredFile` throwing for R2 rows after commit. Port the R2 tests.
    - **7:** leads badge (bell and shell extras for leads); dashboard lead test through the public endpoint.
    - **8:** the public `publicGate` in `proxy.ts` (set and strip `x-cp-path`, plus an e2e for preview exit `?to`); the SEO tab in page and service editors and the dashboard SEO score (8.1); service `recordMove` plus the redirects tag (8.2).
    - **9:** AI hooks in versioned-editor, ⌘J, AI Next-up.
    - **10:** builder keywords, the "New page" palette action, Copy to new page, `pages/custom/[id]`.
    - **11.5:** the Help "Guides" card, once `docs/runbook.md` exists.

    SchemaForm section card ids are `sf-<path>-card` (CP deviation). The Phase 8 SeoPanel and Phase 9 AI `elementId` anchors must use them.

  - **Phase 4 fix-wave outcome.** Phase 6 restores two R2-only cases dropped from `media-manage-hardening`'s "replace to R2" block: "moves a disk file to R2 and retires the disk file" and "refuses (409) when R2 is disconnected mid-put". Phase 8 swaps the local `SEO_FIELDS_META` stub in `tests/unit/admin/resolve-widget.test.ts` back to the import from `@/components/admin/seo/seo-meta`.

## Execution

- Method: superpowers:subagent-driven-development.
- Before each phase, write its phase plan from the actual code and SP's matching phase plan.
- After each phase, run the phase-end gate and commit.
- Never push.
