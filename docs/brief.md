# Cleaning Partners: Project Brief

Living brief for turning the static Cleaning Partners Ltd (CP) site into a database-driven site with an admin panel ported from Security Partners (SP, reference commit `1a9f65d`, read-only).

- Design source of truth: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (the spec).
- Execution: `docs/superpowers/plans/2026-10-25-admin-platform.md` (the master plan).
- This file is never edited silently. Every change after Phase 0 is appended under **Changes** with a date.

---

## 1. Intent and goals

CP is the sister company of SP. CP's public site (`cleaning.raynx.ie`) is a static Next.js 16 site built from Figma: Home, About, Services, Service detail, Blog, Blog detail, Contact. The owner wants CP to get **exactly the same backend and admin panel SP has**: the same layout, sections, behaviour and operations, with Cleaning Partners content and branding in place of Security Partners.

Owner's words: "same lagbe, just core feature gulo thik rekhe" (the same, with the core features kept intact).

Goals (spec §2):

1. **Feature parity with SP's current admin and backend.** Every admin screen, API route, role, workflow (draft → publish, revisions, scheduling, preview), integration, script and deploy step SP has today exists in CP and works the same way.
2. **The public site becomes database-driven without changing how it looks.** Every page of today's CP site renders from the database after `pnpm db:seed` and is visually identical to the current site.
3. **Everything visible on the public site is editable in the admin**, using SP's model: fixed page templates with editable fields, shared sections as globals, collections for repeatable items, plus the `/p/<slug>` block page builder.
4. **Completely separate from SP**: its own database, users and admin login, settings, secrets and media, domain and container. No shared runtime, no shared tables, nothing that lets data cross between the two companies.

## 2. Owner decisions and builder calls

Owner decisions (spec §5.1):

| # | Decision |
|---|---|
| O1 | CP is a fully separate copy of the SP platform: own database, own admin login and users, own settings, own domain. |
| O2 | The admin is the same as SP's in every section and setting; only content and branding change. |
| O3 | Core features are kept exactly as SP has them. |
| O4 | SP is followed for the admin panel and backend only. CP's public site is not SP's: none of SP's public section components or SP-only builder blocks (`iconCards`, `enquireBanner`, `departments`, SP's `hero.page` / `about` / `stats` visuals) are ported. |
| O5 | The public UI is final and frozen. It was built from Figma and is pushed to `main` at commit `3689369`; that commit is the visual baseline. |
| O6 | Every public section is dynamic (editable from the admin). This is CP's core feature. |
| O7 | R2: same bucket as SP, key prefix `cp` (SP uses prefix `sp` in that bucket). |

Builder calls (spec §5.2), made on the owner's behalf:

| # | Call |
|---|---|
| B1 | Port, don't rebuild, for admin and backend. Bring SP's admin and backend code into this repo (server/, lib/, the block/template machinery, emails/, scripts/, components/admin, app/(admin), app/api, app/og, tests, docker, CI, docs/runbook) and adapt it. SP's public components (`components/site`, SP block/template views) are not ported (O4); CP's existing components become the template and block views. (confirm or correct) |
| B2 | The admin's section name "Insights" becomes "Blog" to match CP's public site; routes `/admin/blog/*`. Everything else keeps SP's names. (confirm or correct) |
| B3 | Cookie prefix `cp`; app/package name `cleaning-partners`; Docker service `cleaning-web` (already used in this repo's `docker-compose.yml`); image `ghcr.io/mdnhs/cleaning-partners`; Postgres role/db `cp`; R2 key prefix `cp` (shared bucket, O7). (confirm or correct) |
| B4 | Admin colours: SP's admin token structure with a `cleaning-partners` preset derived from CP brand tokens (`--color-brand #11b1d1`, `brand-deep #0e93ad`, `brand-soft #e3f6fa`, `navy #28648f`, `navy-dark #1c3f5a`), replacing SP's green/navy. Same admin font (Plus Jakarta Sans), same shell. Contrast-tuned `destructive`/`warning` kept from SP. (confirm or correct) |
| B5 | Public theme default emits no `<style>` and equals today's `app/globals.css` values (SP ruling 4). (confirm or correct) |
| B6 | Env stays exactly SP's three: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. SMTP, R2, Turnstile and AI are configured in Settings ▸ Integrations. (confirm or correct) |
| B7 | Defaults from SP carry over: seven roles, Europe/Dublin + en-IE, lead retention 24 months, Turnstile invisible-only, uploads fall back to local disk until R2 is set, in-process scheduler, one app replica. (confirm or correct) |
| B8 | Lead notification default recipient: `info@cleaningpartners.ie`. (confirm or correct) |
| B9 | Privacy and Terms pages are added as `legal` templates (SP has them; CP's footer already links to them). Placeholder legal copy, marked for owner review. (confirm or correct) |
| B10 | SP's `/team` page is not added: CP has no team page; the Team section lives on Home and About. Team stays a collection. (confirm or correct) |
| B11 | Branch + cut-over, like SP. All work happens on `feat/dynamic-platform`; `main` (auto-deployed to Dokploy) keeps serving today's static site until full parity, then merges in one cut-over. Local dev uses a Docker Postgres. The owner only needs to provision the Dokploy Postgres and env vars before cut-over, not on day 1. No half-built `/admin` or DB-driven page is ever public. (confirm or correct) |
| B12 | R2 per O7: every CP object key (media, backups, exports) starts with `cp/`; code never lists or reads outside that prefix. `r2:bootstrap` input vars renamed `CP_R2_*`. (confirm or correct) |

## 3. Non-goals and anti-goals

Non-goals (spec §3):

- Changing the public design. The Figma-built pages are frozen (same rule SP follows).
- A combined admin that manages both companies.
- Features SP does not have today. The Newsletter module was removed from SP (commit `a320ab0`), so CP does not get it either. Same for SP's own non-goals: authors taxonomy, Meta Conversions API, live-save editing, usage/cost dashboards.
- Multi-language, public user accounts, e-commerce.

Anti-goals, which would be a failure even if it "works" (spec §4):

- Any visible change to the existing public pages after seeding.
- CP code or data reaching SP (shared DB, writing outside the `cp/` R2 prefix, shared cookies, a copied `BETTER_AUTH_SECRET`).
- Security Partners names, copy, logos, colours, emails or domains left anywhere in CP's admin, emails, seed data, OG images or docs.
- A "lighter" admin: missing screens, missing roles, or features stubbed out.

## 4. Target architecture

One Next.js 16.3.8 app with SP's layering:

- Public site in `app/(site)` renders fixed templates from Postgres through cached `queries`.
- Admin in `app/(admin)/admin`.
- Hono API at `app/api/[...route]`.
- Server code under `server/` (routes → service → repo).
- Admin and backend code is ported from SP at `1a9f65d` and rebranded. CP's existing public components become the template and block views; SP's public components are never ported.

Tree (SP's, with CP deltas):

```
app/(site)/          public pages; CP's own routes: /, /about, /services, /services/[slug], /blog, /blog/[slug], /contact, /privacy, /terms, /p/[slug]
app/(admin)/admin/   admin screens ("Blog" at /admin/blog/*, not "Insights")
app/api/[...route]/  Hono entry
app/og/              OG image generation (CP logo and colours)
components/          CP public components (props-driven after Phase 3) + components/admin (ported)
templates/           home, about, services, blog, contact, legal  (no "team": B10)  + shared machinery
blocks/              CP's 15 block types only (O4)
lib/                 pure code; never imports server/. lib/theme/cp-admin.ts (CP_ADMIN); preset "cleaning-partners"
server/              server-only: api, auth, db (migrations 0000-0020 ported, CP starts at 0021), modules, lib (R2_PREFIX = "cp/")
emails/              CP-branded React Email templates
scripts/             db:*, admin:create, owner:recover, demo:seed, backup, restore-drill, secrets:rotate, db:sync, custom-code:off, r2:bootstrap, data:import, data:export-to-r2, check-inventory
tests/               unit, integration, dom, e2e, visual (0 px gate against 3689369 baselines)
```

Boundaries (same as SP): every `server/**` file starts with `import "server-only"`; `lib/**`, `blocks/**` and `templates/*/schema.ts` never import `server/**`; only repos and `server/db/**` import Drizzle query builders; Hono handlers run `zv` → `can()` → service, and services re-check permissions and `writeAudit` every mutation.

Constraints:

- Env is exactly `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (plus platform `NODE_ENV`, `PORT`, `HOSTNAME`).
- `next build` must pass with no env and no DB.
- Next.js 16.3.8 as installed; read `node_modules/next/dist/docs/` before writing framework code (AGENTS.md).
- Deploy target: Dokploy compose app for `cleaning.raynx.ie`, own Postgres 17 service, one replica.
- Dev services run beside SP's: Postgres on `127.0.0.1:5434`, Mailpit SMTP on `127.0.0.1:1026` and UI on `127.0.0.1:8026`, Playwright port 3200.
- Never push; never merge to `main`.

Dependencies use SP's exact pinned versions.

## 5. Content model

Collections (spec §6.3):

- `services`: SP's editor; fields = today's `lib/services.ts` (summary, tags, hero description, cover, overview title/paragraphs, included[], places[], icon, SEO).
- `articles`: today's `lib/blog-posts.ts`; body becomes TipTap JSON; read time computed.
- `article_categories`: Medical, Commercial, Domestic, Education, Retail, ULV Fogging.
- `team_members`, `clients`, `group_companies` (Security Partners, MJS Eco).
- `testimonials` (new; name, initials, quote, rating 1..5, sortOrder; same immediate-publish rules as SP's small collections). The only collection CP adds; it exists because the public site has a testimonials section on five routes (home, about, services, every service detail).

Globals (`settings`): SP's key set with CP content. A section rendered on more than one page is a global (O6).

```ts
export const settingsSchemas = {
  site, contact, navigation, footer,
  "sections.clients",        // home, about, services
  "sections.whyChooseUs",    // home, about, services, every /services/[slug]
  "sections.contact",        // every route (7), title overridable per page
  "sections.map",            // home, contact
  "sections.team",           // home, about (heading; members are the team collection)
  "sections.testimonials",   // home, about, services, every /services/[slug] (heading; items are the testimonials collection)
  "sections.howItWorks",     // every /services/[slug]
  "seo.defaults", consent, tracking, customCode, microcopy, leads,
  theme,
}
// SP keys NOT in CP: "sections.enquireBanner", "sections.about"
```

`settings.contact` content: phone 057 8697670 Ext 4, mobile/24hr 085 806 2369, `info@cleaningpartners.ie`, Mon–Fri 9am–6pm, Derryguile, Mountmellick, Co. Laois, R32 YX49. Also `integrations.*`.

Other contracts:

- `TemplateName = "home" | "about" | "services" | "blog" | "contact" | "legal"`; page keys: home, about, services, blog, contact, privacy, terms.
- `BlockType` = hero, hero.page, ourStory, stats, services, whyChooseUs, clients, team, testimonials, blog, howItWorks, contact, quoteForm, map, richtext.
- `R2_PREFIX = "cp/"`.
- Seed fixtures: every string, image and link the site shows today, taken from the current components and `lib/*.ts`. Seeded media = the files in `public/images/**`.

Forms (spec §6.5): the contact page quote form and the "Fill the Form" CTAs post to SP's public leads endpoint (honeypot, optional Turnstile, rate limit, consent capture), replacing today's `mailto:` handoff. Fields: name, phone, email, service (services collection + Domestic Cleaning + Other), address/Eircode, message, consent.

Visual gate (spec §6.4): Playwright baselines at commit `3689369` before any refactor (desktop 1440×900 and mobile 390×844, animations off). After seeding, every page matches at 0 px in every phase.

## 6. Page → template table

| Page key | URL | Sections (today's components) |
|---|---|---|
| `home` | `/` | Hero · Clients (shared) · Services intro + list · Why Choose Us (shared) · Testimonials · Team · Blog (latest 3) · Contact (shared) · Location map (shared) |
| `about` | `/about` | Page hero · Our Story (eyebrow, title, paragraphs, sector chips, 2 images, CTA) · Stats (4 items) · Clients · Why Choose Us · Team · Testimonials · Contact |
| `services` | `/services` | Page hero · Services grid heading/intro + "Not sure" CTA card · Why Choose Us · Clients · Testimonials · Contact |

Shared sections on the dynamic routes (not template pages): `/services/[slug]` also renders How It Works, Why Choose Us, Testimonials and Contact; `/blog` and `/blog/[slug]` render Contact. Contact therefore appears on all 7 routes.
| `blog` | `/blog` | Page hero · featured article picker · filter bar (categories with `showInFilter`) · search · pagination size |
| `contact` | `/contact` | Page hero · Contact (shared, title "Ways to Reach Us") · Quote form (heading, intro, next-steps[], urgent box, form copy) · Location map |
| `privacy`, `terms` | `/privacy`, `/terms` | Legal template (as SP) |

Detail routes come from collections: `/services/[slug]` (service detail: hero, overview, included[], places[], How It Works, sidebar) and `/blog/[slug]` (article: header, body, tags, share, author box, sidebar, related). Builder pages: `/p/[slug]`, with a block library of CP's own sections only (O4).

## 7. Phases

Order: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. Phase 3 precedes 4 (editors need CP templates). Task 3.3 writes the renderer's mapping table; Task 5.2 builds the editor around it.

| Phase | Scope |
|---|---|
| 0 | Baselines and inventory: 0.1 field inventory + brief; 0.2 visual baseline harness |
| 1 | Platform core: deps/tooling/branding gate, env/errors/crypto, DB + migrations + dev services, Hono skeleton + health, Docker/entrypoint/CI |
| 2 | Auth, RBAC, users, audit, admin chrome base (roles, Better Auth, audit + session DAL, users + emails, admin layout + CP preset + proxy, account security + bootstrap scripts) |
| 3 | CP content model and public site from the DB (schemas, template schemas + editor-meta, fixtures + seed + queries, route groups + props-driven components, public pages from DB with caching and legal pages; visual gate 0 px after seed) |
| 4 | Admin shell and editors (shell/nav/⌘K, versioning + preview, SchemaForm, page editor, settings editors, collections + services editor, dashboard/help/activity/users/account) |
| 5 | Blog workflow (articles service + API, TipTap editor + CP renderer, `/admin/blog/*` screens, scheduler + jobs) |
| 6 | Media (storage drivers, media service + upload API, library UI + picker, migrate-to-R2 job) |
| 7 | Integrations, email, leads (integrations module, mailer + lead emails, public leads endpoint + quote form wiring, leads inbox/board/CSV/retention) |
| 8 | SEO and marketing (SEO fields/metadata/JSON-LD/OG, sitemap/robots/redirects, consent/tracking/custom code/events) |
| 9 | Appearance, Design, AI assistant |
| 10 | Page builder (block machinery + CP block library, `builder_pages`, public `/p/[slug]`, builder UI) |
| 11 | Hardening, ops, E2E, launch (ops scripts, security pass, E2E + admin visual baselines, CI + deploy gating, docs + cut-over checklist) |

Every phase ends green: `pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual` (plus `pnpm test:e2e` from Phase 2).

## 8. Owner-only steps

Cannot be automated (spec §10):

- Before cut-over: create the Dokploy compose app + Postgres for `cleaning.raynx.ie` and set the three env vars (new `BETTER_AUTH_SECRET`, never SP's).
- Run `admin:create` in the production container for the first owner.
- Enter SMTP, R2, Turnstile and AI credentials in Settings ▸ Integrations.
- Review placeholder privacy/terms copy and the service detail copy for the four services Figma did not cover.

## 9. Field inventory summary

Full list: `docs/brief-inventory.json`. Validate with `pnpm dlx tsx scripts/check-inventory.ts`. The validator checks kinds, target roots, unique ids, source line range, and that each value appears verbatim in its source file after collapsing whitespace and decoding JSX entities. Dynamic values (template literals) are recorded as written in the source. Entries carry optional flags: `template: true` marks a field whose seeded value is an SP-style interpolation string, recorded in `seed` using `{identifier}` placeholders only (SP `lib/interpolate.ts`; e.g. `"Learn more about {title}"`, `"Tel: {office} Ext {officeExtension}"`). `value` keeps the source text and is verbatim-checked; `seed` is not verbatim-checked but must contain only `{identifier}` placeholders (no `${...}`), and every `template` entry must have one. `derived: true` marks a usage computed from another field (route hrefs from a slug, `tel:`/`mailto:` hrefs from the contact facts, the star count from `rating`); it is not an editable field, and needs a non-derived source entry for its target or a `note`. Entries sharing a target must carry the same literal value unless derived, template or a render-time binding (`{x.y}`). Contact facts have a single source under `settings.contact.*` (`phone24h`, `office`, `officeExtension`, `mobile`, `email`, `hours`, `addressLine1`, `addressLine2`); every other occurrence is a template or derived. SEO lives under `seo.*`: per-page `pages.<key>.seo.title|description`, and service/article titles through `settings.seo.defaults.titleTemplate` (`"{title} | Cleaning Partners Ltd."`). Source files are read from baseline commit `3689369` via `git show`, so the validator keeps working after Phase 3 moves the components. A `kind:"list"` entry holds the item count in `value` and the array identifier in `array`; there is one entry per distinct item field, never one per item. For array fields, `value` is the first item's literal as a representative.

Placement rule: a literal rendered on more than one page goes to its `settings.*` key. A literal on one page goes to `pages.<key>`. Per-page overrides get their own entry (`pages.contact.contactTitle` = "Ways to Reach Us").

Total: **366 entries**.

By kind:

| kind | count |
|---|---|
| text | 217 |
| image | 39 |
| href | 32 |
| list | 27 |
| meta | 14 |
| aria | 13 |
| alt | 11 |
| tel | 6 |
| richText | 6 |
| mailto | 1 |

By target root:

| target root | count |
|---|---|
| `pages.home` | 27 |
| `pages.about` | 21 |
| `pages.services` (grid, hero, detail labels) | 29 |
| `pages.blog` (list and article labels) | 32 |
| `pages.contact` (hero, quote form) | 35 |
| `services[]` | 34 |
| `articles[]` | 34 |
| `categories[]` | 5 |
| `team[]` | 6 |
| `clients[]` | 4 |
| `testimonials[]` | 5 |
| `groupCompanies[]` | 6 |
| `settings.site` | 9 |
| `settings.contact` | 21 |
| `settings.navigation` | 10 |
| `settings.footer` | 12 |
| `settings.sections.*` | 51 |
| `settings.seo.defaults` | 4 |
| `settings.consent` | 0 |
| `settings.microcopy` | 21 |

By page (entries that render on the URL; shared entries count once per page):

| URL | entries |
|---|---|
| `/` | 154 |
| `/about` | 125 |
| `/services` | 135 |
| `/services/[slug]` | 139 |
| `/blog` | 105 |
| `/blog/[slug]` | 152 |
| `/contact` | 132 |

`/privacy` and `/terms` do not exist yet (B9); their fields are added when Task 3.2 creates the legal template.

Not recorded, by design: decorative `alt=""`, `aria-hidden` glyphs, class names, data attributes, font config, and logic constants (`PAGE_SIZE`, `slice(1, 4)`).

## Changes

