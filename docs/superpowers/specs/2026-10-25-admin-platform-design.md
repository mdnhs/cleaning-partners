# Cleaning Partners — Backend + Admin Platform (Design)

Date: 2026-10-25 · Status: draft for owner approval
Reference implementation (read-only): `/Users/nazmulhasansourab/ireland/security-partners` ("SP"), at commit `1a9f65d`.
SP's own design history: `docs/superpowers/specs/2026-10-16-dynamic-platform-design.md` (base spec), `docs/superpowers/specs/2026-10-19-mk-parity-design.md` (admin parity spec), `docs/brief.md`, `docs/runbook.md`, `docs/platform-starter-prompt.md`.

---

## 1. Intent

Cleaning Partners Ltd (CP) is the sister company of Security Partners Ltd. CP's public site (`cleaning.raynx.ie`) is a static Next.js 16 site built from Figma: Home, About, Services, Service detail, Blog, Blog detail, Contact. The owner wants CP to get **exactly the same backend and admin panel SP has**: the same layout, the same sections (Dashboard, Pages, Blog, Services, Collections, Media, Leads, SEO, Marketing, Appearance, Design, Settings incl. Integrations and AI assistant, Users, Activity, Account, Help), the same behaviour and the same operations, with Cleaning Partners content and branding in place of Security Partners.

Owner's words: "same lagbe, just core feature gulo thik rekhe" — the same, with the core features kept intact.

## 2. Goals

1. **Feature parity with SP's current admin and backend.** Every admin screen, API route, role, workflow (draft → publish, revisions, scheduling, preview), integration, script and deploy step SP has today exists in CP and works the same way.
2. **The public site becomes database-driven without changing how it looks.** Every page of today's CP site renders from the database after `pnpm db:seed` and is visually identical to the current site (see §6.4).
3. **Everything visible on the public site is editable in the admin**, using the same model SP uses: fixed page templates with editable fields, shared sections as globals, collections for repeatable items, plus the `/p/<slug>` block page builder.
4. **Completely separate from SP**: its own database, its own users and admin login, its own settings, secrets and media, its own domain and container. No shared runtime, no shared tables, nothing that lets data cross between the two companies.

## 3. Non-goals

- Changing the public design. The Figma-built pages are frozen (same rule SP follows).
- A combined admin that manages both companies.
- Features SP does not have today. The Newsletter module was removed from SP (commit `a320ab0`), so CP does not get it either. Same for SP's own non-goals: authors taxonomy, Meta Conversions API, live-save editing, usage/cost dashboards.
- Multi-language, public user accounts, e-commerce.

## 4. Anti-goals (would be a failure even if it "works")

- Any visible change to the existing public pages after seeding.
- CP code or data reaching SP (shared DB, writing outside the `cp/` R2 prefix, shared cookies, a copied `BETTER_AUTH_SECRET`).
- Security Partners names, copy, logos, colours, emails or domains left anywhere in CP's admin, emails, seed data, OG images or docs.
- A "lighter" admin: missing screens, missing roles, or features stubbed out.

## 5. Decisions taken

### 5.1 Owner decisions (from the conversation)

| # | Decision |
|---|---|
| O1 | CP is a fully separate copy of the SP platform: own database, own admin login and users, own settings, own domain. |
| O2 | The admin is the same as SP's in every section and setting; only content and branding change. |
| O3 | Core features are kept exactly as SP has them. |
| O4 | **SP is followed for the admin panel and backend only.** CP's public site is not SP's: none of SP's public section components or SP-only builder blocks (`iconCards`, `enquireBanner`, `departments`, SP's `hero.page` / `about` / `stats` visuals) are ported. |
| O5 | **The public UI is final and frozen.** It was built from Figma and is pushed to `main` at commit `3689369`; that commit is the visual baseline. |
| O6 | **Every public section is dynamic** (editable from the admin). This is CP's core feature. |
| O7 | **R2: same bucket as SP, key prefix `cp`** (SP uses prefix `sp` in that bucket). |

### 5.2 Builder's calls (made on the owner's behalf; marked so the owner can correct)

| # | Call |
|---|---|
| B1 | **Port, don't rebuild, for admin + backend.** Bring SP's admin and backend code into this repo (server/, lib/, the block/template *machinery*, emails/, scripts/, components/admin, app/(admin), app/api, app/og, tests, docker, CI, docs/runbook) and adapt it. SP's public components (`components/site`, SP block/template views) are not ported (O4); CP's existing components become the template and block views. |
| B2 | The admin's section name "Insights" becomes **"Blog"** to match CP's public site; routes `/admin/blog/*`. Everything else keeps SP's names. |
| B3 | Cookie prefix `cp`; app/package name `cleaning-partners`; Docker service `cleaning-web` (already used in this repo's `docker-compose.yml`); image `ghcr.io/mdnhs/cleaning-partners`; Postgres role/db `cp`; R2 key prefix `cp` (shared bucket, see O7). |
| B4 | Admin colours: SP's admin token structure with a **`cleaning-partners` preset** derived from CP brand tokens (`--color-brand #11b1d1`, `brand-deep #0e93ad`, `brand-soft #e3f6fa`, `navy #28648f`, `navy-dark #1c3f5a`), replacing SP's green/navy. Same admin font (Plus Jakarta Sans), same shell. Contrast-tuned `destructive`/`warning` kept from SP. |
| B5 | Public theme default emits no `<style>` and equals today's `app/globals.css` values (SP ruling 4). |
| B6 | Env stays exactly SP's three: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. SMTP, R2, Turnstile and AI are configured in Settings ▸ Integrations. |
| B7 | Defaults from SP carry over: seven roles, Europe/Dublin + en-IE, lead retention 24 months, Turnstile invisible-only, uploads fall back to local disk until R2 is set, in-process scheduler, one app replica. |
| B8 | Lead notification default recipient: `info@cleaningpartners.ie`. |
| B9 | Privacy and Terms pages are added as `legal` templates (SP has them; CP's footer already links to them). Placeholder legal copy, marked for owner review. |
| B10 | SP's `/team` page is **not** added: CP has no team page; the Team section lives on Home and About. Team stays a collection. |
| B11 | **Branch + cut-over, like SP.** All work happens on `feat/dynamic-platform`; `main` (auto-deployed to Dokploy) keeps serving today's static site until full parity, then merges in one cut-over. Local dev uses a Docker Postgres. The owner only needs to provision the Dokploy Postgres and env vars before cut-over, not on day 1. No half-built `/admin` or DB-driven page is ever public. |
| B12 | R2 per O7: every CP object key (media, backups, exports) starts with `cp/`; code never lists or reads outside that prefix. `r2:bootstrap` input vars renamed `CP_R2_*`. |

## 6. What gets built

### 6.1 Platform (identical to SP)

Stack, architecture rules, API conventions, auth/RBAC (roles, permissions matrix, 2FA, impersonation, audit), versioning, caching, media pipeline, leads + email, SEO (meta, JSON-LD, OG generation, sitemap, robots, redirects), marketing (consent, tracking, events, owner-only custom code), Appearance + Design screens, AI assistant (providers, encrypted key, role allow-list, insert-into-field, conversation history, owner-only "share enquiry details"), dashboard, ⌘K, Help, Activity log, ops scripts (`db:*`, `admin:create`, `owner:recover`, `demo:seed`, `backup`, `restore-drill`, `secrets:rotate`, `db:sync`, `custom-code:off`, `r2:bootstrap`, `data:import`, `data:export-to-r2`), Docker entrypoint (migrate → import → auto-seed empty DB → R2 bootstrap), CI and deploy gating. Source of truth for behaviour is SP's code at `1a9f65d`; SP's specs explain why.

Dependencies use SP's pinned versions.

### 6.2 Public pages → templates

CP's current pages become fixed templates (layout and section order in code, fields in the DB), in the same shape as SP's `templates/<name>/{schema,render,view,editor-meta}`:

| Page key | URL | Sections (today's components) |
|---|---|---|
| `home` | `/` | Hero · Clients (shared) · Services intro + list · Why Choose Us (shared) · Testimonials · Team · Blog (latest 3) · Contact (shared) · Location map (shared) |
| `about` | `/about` | Page hero · Our Story (eyebrow, title, paragraphs, sector chips, 2 images, CTA) · Stats (4 items) · Clients · Why Choose Us · Team · Testimonials · Contact |
| `services` | `/services` | Page hero · Services grid heading/intro + "Not sure" CTA card · Why Choose Us · Clients · Testimonials · Contact |
| `blog` | `/blog` | Page hero · featured article picker · filter bar (categories with `showInFilter`) · search · pagination size |
| `contact` | `/contact` | Page hero · Contact (shared, title "Ways to Reach Us") · Quote form (heading, intro, next-steps[], urgent box, form copy) · Location map |
| `privacy`, `terms` | `/privacy`, `/terms` | Legal template (as SP) |

Detail routes come from collections: `/services/[slug]` (service detail: hero, overview, included[], places[], How It Works, sidebar) and `/blog/[slug]` (article: header, body, tags, share, author box, sidebar, related). Builder pages: `/p/[slug]` with SP's block-builder machinery (registry, editor, ordering, draft/publish), but the block library is **CP's own sections only** (O4): Hero, Page hero, Our Story, Stats, Services, Why Choose Us, Clients, Team, Testimonials, Blog, How It Works, Contact, Quote form, Location map, Rich text.

**Every section is dynamic (O6).** No visible string, image, link, list item or CTA on any public page stays hard-coded in a component; each one is a template field, a global, or a collection row. Components keep only layout and styling. The field inventory in phase 0 lists every one, and a test fails if a public component renders a literal user-visible string.

### 6.3 Content model (CP mapping onto SP's model)

- **Collections**: `services` (SP's editor; fields = today's `lib/services.ts`: summary, tags, hero description, cover, overview title/paragraphs, included[], places[], icon, SEO), `articles` (today's `lib/blog-posts.ts`; body becomes TipTap JSON; read time computed), `article_categories` (Medical, Commercial, Domestic, Education, Retail, ULV Fogging), `team_members`, `clients`, `group_companies` (Security Partners, MJS Eco), and **`testimonials`** (new: name, initials, quote, rating; same immediate-publish rules as SP's small collections). Testimonials is the only collection CP adds; it exists because CP's public site has a testimonials section on four pages.
- **Globals** (`settings`): SP's key set, with CP content: `site`, `contact` (phone 057 8697670 Ext 4, mobile/24hr 085 806 2369, `info@cleaningpartners.ie`, Mon–Fri 9am–6pm, Derryguile, Mountmellick, Co. Laois, R32 YX49), `navigation`, `footer`, `sections.*` (whyChooseUs, clients, contact, map, howItWorks), `seo.defaults`, `consent`, `tracking`, `customCode`, `microcopy`, `leads`, `integrations.*`, theme.
- **Seed fixtures**: every string, image and link the site shows today, taken from the current components and `lib/*.ts` data files. Seeded media = the files in `public/images/**`.

### 6.4 Visual gate

Take Playwright visual baselines of the public site at commit `3689369` (O5) **before** any refactor (desktop 1440×900 and mobile 390×844, animations off), using SP's `tests/visual` harness. After seeding, every page must match at 0 px, in every phase. Same for the consent banner (hidden while tracking is off).

### 6.5 Forms

The contact page quote form and the "Fill the Form" CTAs post to SP's public leads endpoint (honeypot, optional Turnstile, rate limit, consent capture), replacing today's `mailto:` handoff. Fields are today's: name, phone, email, service (from the services collection + Domestic Cleaning + Other), address/Eircode, message, consent.

### 6.6 Branding sweep

Replace in code, copy, emails, OG cards, JSON-LD, seed data, docs, CI and Docker: Security Partners → Cleaning Partners, `securitypartnersltd.com` → `cleaningpartners.ie`, `security.raynx.ie` → `cleaning.raynx.ie`, `sp` prefixes → `cp`, SP logos → CP logos (`public/images/home/logo.png`, `cleaning-partners-logo.png`). The group-companies collection lists **Security Partners** as a sister company — that reference is content, not leftover branding.

## 7. Constraints

- Next.js 16.3.8 as installed; read `node_modules/next/dist/docs/` before writing framework code (AGENTS.md).
- `next build` must succeed with no env vars and no database.
- SP's architecture rules hold (server-only, thin routes, repos-only Drizzle, `lib/` never imports `server/`).
- Deploy target: Dokploy, compose app for `cleaning.raynx.ie`, own Postgres 17 service, one replica.
- Don't push to SP or touch the SP repo; it is read-only reference.

## 8. Phases (suggested)

0. Visual baselines of today's CP site + field inventory. 1. Port infrastructure, env, DB, Docker, CI. 2. Auth, RBAC, users, audit. 3. Content model, templates, seed, public site from DB (visual gate at 0 px). 4. Admin shell + editors, CP admin preset. 5. Blog workflow. 6. Media. 7. Leads + email (wire the quote form). 8. SEO, marketing, consent. 9. Appearance/Design, AI assistant. 10. Hardening, ops scripts, E2E, docs (`docs/brief.md`, `docs/runbook.md`, `docs/launch.md` for CP).

## 9. Left to the builder

- Exact order of porting files and how to split commits.
- How each CP section maps to block/template code, as long as the visual gate holds.
- Admin preset token values, as long as they derive from CP's brand tokens and pass SP's contrast checks.
- Test coverage beyond SP's existing suites, adapted to CP content.

## 10. Owner must do (cannot be automated)

- Before cut-over: create the Dokploy compose app + Postgres for `cleaning.raynx.ie` and set the three env vars (new `BETTER_AUTH_SECRET`, never SP's).- Run `admin:create` in the production container for the first owner.
- Enter SMTP, R2, Turnstile and AI credentials in Settings ▸ Integrations.
- Review placeholder privacy/terms copy and the service detail copy for the four services Figma did not cover.
