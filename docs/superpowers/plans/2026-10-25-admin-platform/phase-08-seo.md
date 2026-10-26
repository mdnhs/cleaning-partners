# Phase 8: SEO and marketing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 8.1–8.3, plus every Changes item tagged 8 / 8.1 / 8.2 / 8.3). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (§6.1 SEO and marketing, §6.4 visual gate incl. the consent banner, §6.6 branding sweep of OG cards and JSON-LD, §4 anti-goals, B6 no new env, B11 cut-over). Branch `feat/dynamic-platform`, phase base `21d478c`. Never push.

**Goal:** Give CP all of SP's SEO and marketing features:
- the public gate in `proxy.ts` (blocking metadata, `x-cp-path`, the redirects table, real 404s for unknown slugs);
- JSON-LD on every page, generated OG cards in CP's brand, sitemap and robots from the database, and Lighthouse SEO 100 on `/`;
- the SEO admin: overview with health and checks, record SEO sheet, the SEO tab in the page, service and article editors, SEO defaults, redirects with CSV, and the dashboard SEO score and content health;
- automatic 301s when a published service or article is renamed or deleted (`recordMove`);
- marketing: tracking (GTM, GA4, Meta) loaded only after consent, the consent banner, typed events and the events page, owner-only custom code, and the first-touch attribution e2e.

Tracking is off in the seed, so the public site stays at 0 px: no banner, no scripts, no visible change.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only (`git -C <sp> show 1a9f65d:<path>`). Port the final-state files. Rationale, skim, don't copy:
- SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-08-seo.md`. Its "Corrections to master plan" section explains why redirects and the 404 live in the proxy, why `htmlLimitedBots`, why OG cards are a route handler, why per-record SEO is unversioned, and how custom code is injected;
- mk-parity `phase-D1-seo-redirects.md` (D1.2 checks, D1.3 social fields, D1.4 SeoPanel and SEO tab, D1.5 overview, D1.6 defaults, D1.7–D1.8 redirects and CSV);
- mk-parity `phase-D2-marketing-events.md` (D2.1 channels, D2.2 consent version and preview, D2.3 snippets and kill switch, D2.4 events). Its Review Focus 1–5 apply here unchanged.

**What CP already has** (ported in earlier phases; don't port again):
- the schemas and migrations: `lib/schemas/settings/{seo-defaults,consent,tracking,custom-code}.ts`, migrations `0008`, `0009`, `0013`, `0014`, `0015`, `0016` with their migration tests, and `server/db/schema/redirects.ts`;
- the seeded `settings.seo.defaults` (title, `titleTemplate` "{title} | Cleaning Partners Ltd.", description, `organization` with the Mountmellick address, `robots: "index"`), `settings.consent` (copy, `manageLabel`), `settings.tracking` (`enabled: false`) and `settings.customCode` (no snippets);
- `lib/seo/{redirects,urls}.ts`, `lib/analytics/{consent,events,snippets}.ts`, `lib/leads/attribution.ts`, `lib/admin/growth-settings.ts`, `lib/request-path.ts` (`REQUEST_PATH_HEADER = "x-cp-path"`), and the `seo`, `redirect`, `marketing` and `customCode` permissions;
- `templates/shared/page-meta.ts` (per-page title, description, canonical, OG and Twitter metadata, already rendered by every public page), `templates/shared/structured-data.ts` (JSON-LD builders, not rendered yet) and `templates/shared/consent.ts`;
- the `seo` jsonb column on pages, services and articles, and the `mediaValues` hook in `server/lib/versioning.ts`;
- the editor SEO tab plumbing (`components/admin/editor/editor-tabs.tsx`, the `seo` slot of `versioned-editor.tsx`), the dashboard `content-health.tsx` and the kit gauge, the SEO and Marketing nav entries, and the Growth keys in the revisions allow-list;
- `chrome-launcher@1.2.2`, `lighthouse@13.5.0` and `schema-dts@2.1.0` in `package.json` (ported in Task 1.1).

**SP files CP lacks** (from `git ls-tree` diffed against `git ls-files`). Each is placed in a task below, or excluded by R8-17:
- server: `server/modules/seo/{queries,repo,routes,service}.ts`, `server/modules/redirects/{repo,resolve,routes,service}.ts`, `server/modules/marketing/{public,routes,service}.ts`;
- lib: `lib/seo/{blocking-metadata,checks,effective,internal-links,json-ld,og-card,share-image,sitemap}.ts`, `lib/schemas/api/{seo,redirects,marketing}.ts`, `lib/analytics/{banner-preview-style,channel-status,loaders}.ts`;
- public: `app/og/[kind]/[slug]/{card,route}.tsx`, `app/sitemap.ts`, `app/robots.ts`, `components/seo/json-ld.tsx`, `components/consent/*` (7 files), `components/attribution-capture.tsx`, and SP's `components/site-extras.tsx`;
- admin: `app/(admin)/admin/(panel)/seo/{page,defaults/page,redirects/page}.tsx`, `app/(admin)/admin/(panel)/marketing/{page,consent/page,code/page,events/page}.tsx`, `components/admin/seo/*` (19 files) and `components/admin/marketing/*` (8 files);
- the tests, listed per task.

## Global constraints for this phase

- The master Global Constraints apply in full, including Review Focus #1 (SP leftovers in OG cards and JSON-LD) and #5 (public literals).
- **Public site at 0 px:** every `PUBLIC_URLS` entry at both viewports (visual 44/44). Tasks 1, 2, 3, 8, 9 and 12 touch `proxy.ts`, `next.config.ts`, `app/(site)/**`, `app/og/**`, non-admin `components/**` or `lib/seo/**` / `lib/analytics/**`, so they run `pnpm test:visual` before committing.
- **Never update or add visual baselines.** Admin baselines and the banner-on public baselines wait for 11.3 (R8-12, R8-18).
- **No new env vars, no new dependencies** (R8-16). `server/env.ts`, `package.json` and `pnpm-lock.yaml` are unchanged at the gate.
- `next build` with no env and no DB keeps passing. Every new public DB read sits in `generateMetadata`, in a route handler, in `proxy.ts`, or after `await connection()` inside `<Suspense>` (SP phase-08 constraint).
- `tests/unit/branding.test.ts` and `tests/unit/public-literals.test.ts` stay green on every task.
- Closure rule as in the earlier phases. List every closure file.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R8-1 Port SP's final state, CP deltas only.** Every file in the "lacks" list is SP's `1a9f65d` version with the branding map, CP content and the deltas below. Per-record SEO stays unversioned, as in SP: saves apply at once, last write wins, and the record's `version` is untouched. The SP phase-08 corrections hold in CP unless a ruling here says otherwise.

- **R8-2 `publicGate` and `x-cp-path`** (Phase 4 deferral "8").
  - `proxy.ts` takes SP's `publicGate` and matcher. The matcher covers `/admin/:path*` plus public pages, excluding `api`, `admin`, `_next/`, `og/`, `images/`, `favicon.ico`, `sitemap.xml` and `robots.txt`, anchored per segment so `/apiary` and `/admin-old` still match.
  - On GET and HEAD it **sets** `x-cp-path` to `pathname + search`, overwriting any client value. On any other method it **deletes** the header. A client-sent `x-cp-path` therefore never reaches a page.
  - It adds the blocking-metadata headers (`lib/seo/blocking-metadata.ts`, `HTML_LIMITED_BOTS` in `next.config.ts` as `htmlLimitedBots`), so title, description and canonical are in `<head>` for every user agent.
  - The gate fails open: if the lookup throws, the page is served as if the proxy weren't there.
  - Tests:
    - `tests/unit/proxy.test.ts` replaces the "/admin only" matcher case with SP's cases: public pages match, `/api`, static files, sitemap and robots don't;
    - the header is set on GET, overwritten when the client sent one, and stripped on POST;
    - the admin gate cases are unchanged.
    - New e2e in `tests/e2e/preview.spec.ts` for preview exit `?to`: an editor opens a preview of `/terms`, the `cp.preview` cookie is cleared, and a visit to `/terms?x=1` ends at `/terms?x=1` showing published content with no draft cookie. `?to=https://example.com` lands on `/`, not off-site.

- **R8-3 0 px and `<head>`.** Metadata, JSON-LD and the gate change `<head>` and add non-rendering elements only. Allowed additions: `<meta>`/`<link>` in `<head>`, `<script type="application/ld+json">`, and, only while tracking or custom code is configured, consent-gated `<script>` loaders. No public component's markup, classes or text changes.
  - **Does a frozen test compare `<head>`?** No screenshot does: `tests/visual` compares pixels only. Two e2e tests read head values and must stay true unchanged:
    - `public-site.spec.ts` `toHaveTitle("<hero title> | Cleaning Partners Ltd.")`;
    - `public-404.spec.ts` `meta[name="robots"][content="noindex"]`.
  - So Phase 8 changes no seeded SEO title or description. The frozen inventory targets `settings.seo.defaults.*` and `pages.<key>.seo.*` keep their seed values (Phase 0 note).
  - Proof per task: `pnpm test:visual` 44/44.
  - A new e2e `tests/e2e/seo.spec.ts` case: with the seed (tracking off) every `PUBLIC_URLS` body has no consent banner, no "Cookie settings" button, and no `googletagmanager`, `google-analytics` or `connect.facebook.net` script.

- **R8-4 JSON-LD: Cleaning Partners Ltd from settings.** `components/seo/json-ld.tsx` renders `templates/shared/structured-data.ts` output.
  - The site-wide `LocalBusiness` node (or `ProfessionalService`, per `seo.defaults.organization.type`) is rendered by `SiteExtras` on every page.
  - `Article` and `BreadcrumbList` nodes are rendered on `/blog/[slug]`, and `BreadcrumbList` on `/services/[slug]`.
  - Every business value comes from settings, never from code:
    - `name` and `legalName` come from `settings.site` (seeded "Cleaning Partners Ltd.", the master's "Cleaning Partners Ltd");
    - telephone and email come from `settings.contact` (`057 8697670`, `info@cleaningpartners.ie`);
    - the address, `areaServed` and `sameAs` come from `settings.seo.defaults.organization`;
    - the logo is the absolute URL of `settings.site.logo`;
    - `makesOffer` lists the published services.
  - Tests:
    - port `tests/unit/seo/json-ld.test.ts` and `tests/unit/templates/structured-data.test.ts` with CP values;
    - add a case that edits `settings.site.legalName` and `settings.contact.email` in the sources and sees the JSON-LD follow (nothing hard-coded);
    - no "Security"/`securitypartnersltd` string appears in the output;
    - the e2e parses every `ld+json` block on `/`, a service and an article, and checks `@type` and `legalName` against the seeded settings.
  - `schema-dts` types the builders (typecheck).

- **R8-5 OG cards: CP logo and colours.** `app/og/[kind]/[slug]/{route,card}.tsx` and `lib/seo/{og-card,share-image}.ts` are ported. The order is SP's: record `seo.ogImage`, then `seo.defaults.ogImage`, then the generated card.
  - **CP card design:**
    - white background;
    - the logo top-left, from the published `settings.site.logo` media (read from `public/` for `static` media, fetched for disk or R2, and replaced by the site name in text if unreadable). The path is never hard-coded;
    - the eyebrow in brand `#11b1d1`;
    - the title in `navy-dark` `#1c3f5a`;
    - a `brand` bottom rule, with the host in `navy` `#28648f`.
  - The hex constants live in `card.tsx`. A unit test asserts they equal `--color-brand`, `--color-navy` and `--color-navy-dark` in `app/globals.css`, and that SP's palette (`#0d1b36`, `#67bd31`, `#eef6e8`) appears nowhere under `app/og` or `lib/seo`.
  - **Fonts:** CP's Barlow 800 (title) and Roboto 400 (text), latin `woff`, committed under `assets/fonts/` with the OFL `LICENSE`, as SP committed Lato. They are fetched once (fontsource files on jsDelivr) and are not a dependency. If they can't be fetched, use SP's committed Lato files and say so in the report.
  - The eyebrow words ("Service", "Article") stay code constants as in SP. An OG image is not a public page section, so it's outside O6 and the literals test.
  - **Builder:** the `builder` kind answers 404 until 10.3.
  - Tests:
    - port `tests/unit/seo/og-card.test.ts`;
    - the e2e fetches `/og/page/home`, `/og/service/<slug>` and `/og/article/<slug>`: 200 `image/png`, 1200×630;
    - an unknown id gets 404;
    - a draft-only record gets 404 (published rows only).

- **R8-6 Lighthouse SEO 100 on `/`, no new deps.** Port SP's `tests/e2e/lighthouse-seo.spec.ts` unchanged apart from branding. It runs in `pnpm test:e2e` against the standalone server on port 3200, driving Playwright's Chromium through the already-installed `chrome-launcher` and `lighthouse`. It has two tests: the head check with a browser user agent, and every weighted SEO audit at score 1 with a category score of 1.
  - If an audit fails, fix it with data (SEO fields, alt text in the seed) or with the gate and metadata.
  - If the only fix is a public markup change (link text, crawlable anchors), **stop and report**. Don't edit a frozen component.

- **R8-7 SEO overview, checks, SEO tab and dashboard score** (8.1; Phase 4 deferrals).
  - **Server:** `server/modules/seo/*` and `lib/seo/{checks,effective,internal-links}.ts` are SP's eight checks over published pages, services and articles, plus the alt-text card from media `missingAlt`.
    - Fix links are `<editor>?tab=seo`, as SP's are. Page editors are `/admin/pages/<key>`, services `/admin/services/<id>`, and articles **`/admin/blog/<id>`** (B2; SP's is `/admin/insights`).
    - Any anchor into a SchemaForm section uses the CP card id `sf-<path>-card` (Changes, Phase 4).
  - **Editors:** `SeoPanel` and `editor-seo-tab.tsx` fill the existing `seo` slot of `VersionedEditor` in `page-editor.tsx`, `service-editor.tsx` and `article-editor.tsx`. They save through `PUT /api/v1/admin/seo/entries/:kind/:id`. The panel shows the SERP preview, the social card preview, the checklist and the crawl preview. Remove the "arrives with 8.1" comments.
  - **Test stub:** `tests/unit/admin/resolve-widget.test.ts` drops its local `SEO_FIELDS_META` and imports it from `@/components/admin/seo/seo-meta` (Changes, Phase 4 fix-wave).
  - **Dashboard:** `server/modules/dashboard/service.ts` takes back SP's `seoHealth` part, which is null without `seo:read`. `kpis.seoScore = seoHealth.score`, and `contentHealth` and the SEO QA items return.
    - `tests/integration/api/dashboard.test.ts` turns its `it.todo("SEO score and content health follow seo:read (Phase 8.1)")` into SP's case.
    - The "SEO parts are null until Phase 8.1" case gets SP's name and assertions back.
  - The seeded content gets no target score. The seeded images have zero missing alt (R6-4), so the alt card starts empty.

- **R8-8 Redirects, CSV and `recordMove`** (8.2; Phase 4/5 deferral).
  - `server/modules/redirects/*` is SP's, covering:
    - validation (`fromPathProblem` already in `lib/seo/redirects.ts`);
    - loop a→b→a → 422, and chains capped at 5 hops;
    - `to_path` through `isSafeHref`;
    - 301, 302, 307 and 308, the active flag, notes, last hit and source;
    - CSV export (formula-guarded) and import (max 1000 rows, per-row results).
  - **Restore `recordMove`:**
    - in `server/modules/services/service.ts` at `changeServiceSlug` (`/services/<old>` → `/services/<new>`) and `deleteService` (`/services/<slug>` → `/services`);
    - in `server/modules/articles/service.ts` at `changeArticleMeta` (`/blog/<old>` → `/blog/<new>`) and `deleteArticle` (`/blog/<slug>` → `/blog`).
    - Each happens only when the record was published, inside the same transaction. It re-points redirects that targeted the old address and drops any redirect from the new one. It expires the `redirects` tag. Editors without `redirect` permission still trigger it.
    - Remove the "Phase 8.2 records" markers.
    - Replace the two `it.todo` markers in `tests/integration/api/collections.test.ts` and `tests/integration/api/articles.test.ts` with SP's "records a redirect and expires the redirects tag" cases.
  - **Cut-over gate:** this task clears the master's "Don't cut over before 8.2" blocker: a renamed or deleted published service or article then 301s instead of 404ing. Cut-over is **still not allowed** after Phase 8. It needs Phases 9–11 and the owner's call (B11). The phase report says exactly this.

- **R8-9 Real 404 for unknown slugs in the proxy, no catch-all.** `server/modules/redirects/resolve.ts` is ported.
  - For `/services/:slug` and `/blog/:slug` it checks that the slug is published. Otherwise it looks up `redirects` (with a hit counter written in `waitUntil`), else rewrites to `MISSING_PATH = "/_cp-missing"`.
  - Other unknown paths get the redirect lookup and then fall through.
  - A request with the draft-mode cookie skips the slug check.
  - **CP delta:** CP has no `app/(site)/[...notFound]`. An unmatched path is answered by `app/global-not-found.tsx`, and that is already the frozen `/this-page-does-not-exist` baseline. So the rewrite target needs no new route. Probe it first: a rewrite to `/_cp-missing` must return status 404 with the global not-found page. If it doesn't, add SP's catch-all and **stop and report**: the 404 baseline must stay 0 px, and the Phase 2 note about the `next/dist` import applies.
  - SP's builder branch (`/p/:slug`, `isBuilderSlug`) is left out with a 10.3 marker. `/p/*` just gets the redirect lookup.
  - `tests/e2e/public-404.spec.ts` changes from the soft-404 comment (R3-5) to SP's real 404: `/blog/no-such-article` and `/services/no-such-service` return **status 404**, and their screenshot still equals the unmatched URL's.

- **R8-10 Sitemap lists CP URLs.** `app/sitemap.ts`, `lib/seo/sitemap.ts` and `listSitemapEntries` (`server/modules/seo/queries.ts`) read published rows only (no `draftMode()`). The sitemap lists:
  - the seven static pages from `PAGE_PATHS` (`/`, `/about`, `/services`, `/blog`, `/contact`, `/privacy`, `/terms`);
  - every published service at `/services/<slug>`;
  - every published article at `/blog/<slug>`.

  Each URL is absolute on `publicOrigin(settings.site.productionUrl)`, with `lastmod` from `publishedAt` or `updatedAt`. A record or page with `seo.noindex` is left out. `/blog?category=` and `/blog?q=` views are not listed.
  - Builder pages (`/p/<slug>`) join in 10.3, with a marker.
  - Tests:
    - port `tests/unit/seo/{sitemap,urls}.test.ts` and `tests/integration/queries/sitemap.test.ts`;
    - after the seed, the sitemap holds exactly 7 + 5 services + 7 articles = **19** URLs, matching `PUBLIC_URLS` minus the query views and the 404;
    - a draft service is absent;
    - a noindex article is absent.

- **R8-11 Robots.** `app/robots.ts` is SP's.
  - `Disallow: /admin` and `/api` for every agent, and `Sitemap:` is the absolute `/sitemap.xml`.
  - With `seo.defaults.robots` set to noindex it emits SP's `Disallow: /`, and page metadata adds `noindex`.
  - It reads the published value only. `X-Robots-Tag: noindex` on `/admin` and `/api` is unchanged (2.5).
  - Port `tests/unit/seo/robots.test.ts`.

- **R8-12 Consent and tracking off by default; events.**
  - `SiteExtras` (SP's `components/site-extras.tsx`, minus `SiteThemeStyle`, which is 9.1) renders inside `<Suspense>` at the end of `<body>` in `app/(site)/layout.tsx`. Mount `AttributionCapture` beside it.
  - With `tracking.enabled` false, as seeded, it renders only the JSON-LD and the custom code (none in the seed). There is no banner, no manage button, no `ConsentProvider` DOM and no tracker script. This gives 0 px by construction, and R8-3's e2e pins it.
  - With tracking on:
    - the banner (`components/consent/*`) shows `settings.consent` copy only (O6: every string, aria label and link through `consentBannerCopy` / `linkView`);
    - it is styled with CP site tokens and classes copied from CP's existing CTA. Existing public components are not edited;
    - GTM, GA4 and Meta load only after the matching consent;
    - the consent cookie `cp_consent` lasts 6 months, with version and re-consent (D2 RF1);
    - the "Cookie settings" manage button shows only while tracking is enabled.
  - **Events:** `track()` is typed against `ANALYTICS_EVENTS`. The route tracker sends SPA page views on `cp:navigate`. Delegated `classifyClick` covers tel, mailto and CTA clicks without touching components. The quote form's existing `lead_submitted` stays. The events page lists `EVENT_CATALOGUE` with CP wording.
  - Tests:
    - port the DOM tests `consent-banner{,-view}.test.tsx` with their `__snapshots__/consent-banner-*.html` regenerated for CP markup (these are DOM snapshots, not visual baselines), plus `analytics-loaders`, `attribution-capture`, `consent-preview`, `consent-version-field`, `events-view`, `marketing-notices`, `tracking-status` and `tracking-tag-fields`;
    - port the unit tests `tests/unit/analytics/{banner-preview-style,catalogue,channel-status,consent,events,snippets}.test.ts` and `tests/unit/templates/consent-copy.test.ts`;
    - port the integration tests `marketing.test.ts` and `marketing/public.test.ts`;
    - port the e2e `consent.spec.ts`.
  - **Visual baselines for the banner on** (SP `tests/visual/consent-banner.spec.ts`): not added in this phase. They go to 11.3 with the admin baselines. The e2e takes screenshots, and the implementer looks at them.

- **R8-13 Custom code owner-only, as SP.** `customCode` read and update are owner-only (`GROWTH_SETTINGS`), so admin and editor get 403 on the API, and the screen is hidden from the nav for them.
  - Snippets are emitted server-side as one inline loader `<script>` per placement. Each has a route pattern, an allowed `src` host (https only, no credentials, no port), and the `disabled` kill switch (D2 RF2–3).
  - The revisions allow-list already gates `customCode` owner-only. Its test is extended if SP's covers it.
  - Port `tests/dom/custom-code.test.tsx` and the e2e `custom-code.spec.ts` (admin → 403, owner adds a body snippet → it runs on a matching route only → kill switch → gone).
  - The `pnpm custom-code:off` script is 11.1, as the master lists. The repo function it calls already exists.
  - SP's runbook CSP notes go to 11.5, because `docs/runbook.md` doesn't exist yet. Record them in the phase report.

- **R8-14 Attribution e2e restore** (Phase 7 deferral "8.3"). The `8.3:` marker in `tests/e2e/leads.spec.ts` becomes SP's first-touch attribution test:
  - the owner publishes `tracking.enabled` with no channel IDs through the marketing API;
  - a visitor lands on `/?utm_source=e2e&utm_medium=cpc&utm_campaign=cp-test`, accepts analytics in the banner, goes to `/contact#quote` and submits;
  - the lead detail shows the first-touch source, medium and campaign.
  - A second visitor who rejects consent gives a lead with no attribution.
  - The test restores the published `tracking` value in `finally`. The visual run reseeds anyway (`tests/visual/seed.ts`), but e2e files that run after it must see tracking off.

- **R8-15 Branding.**
  - Rename everything SP-prefixed to CP: `x-cp-path`, `/_cp-missing`, `cp_consent`, `cp_attribution`, `cp:consent`, `cp:navigate`, `__cpConsent` and any other `__cp*` global, `cp.preview`.
  - The OG cards, JSON-LD, robots, the sitemap, admin help text and the events copy name Cleaning Partners only.
  - Articles live under `/admin/blog`, never `/admin/insights`. The SEO overview's article group is labelled "Blog".
  - Test fixtures use CP values: no `sp`-shaped hosts, folders or names (the gate forbids `\bsp[-.][a-z]` and `"sp"`). Redirect fixtures use CP paths such as `/services/office-cleaning` → `/services/commercial-cleaning`.

- **R8-16 No new env vars or deps.** SEO, tracking and custom code are settings (B6). `server/env.ts`, `package.json` and `pnpm-lock.yaml` don't change. Lighthouse and `schema-dts` are already installed. The OG fonts are committed assets, not packages (R8-5).

- **R8-17 Not ported.**
  - SP public components (`components/blog/{blog-card,blog-posts}.tsx`; O4).
  - `lib/admin/legacy-redirects.ts`, its unit test and `legacy-redirects.spec.ts`. CP has no legacy admin URLs (master 1.5).
  - SP's public visual baselines for its blog and consent.
  - `scripts/check-log-secrets.ts` and its test (11.2).
  - `scripts/custom-code-off.ts` and its test (11.1).

- **R8-18 Deferrals out of this phase.**
  - **9.1:** `SiteThemeStyle` inside `SiteExtras`.
  - **9.3:** AI "suggest" hooks in the SeoPanel and the `elementId` anchors (which must use `sf-<path>-card`).
  - **10.3:** builder pages in resolve, the sitemap and OG (`/p/<slug>`, kind `builder`).
  - **11.1:** `custom-code:off`.
  - **11.2:** confirm the proxy cost on production (one indexed query per detail or unknown-path request) and the CSP for custom code.
  - **11.3:** admin visual baselines (SEO overview, sheet, defaults, redirects and its dialog, marketing tracking and consent), the banner-on public baselines, the admin a11y URLs for the new screens, and `seo-admin.spec.ts` screens re-shot.
  - **11.5:** the runbook sections "Custom code and Content-Security-Policy" and "Verify domains by DNS" (custom-code verification `<meta>` exists only after JS).

  The controller records these in the master Changes at phase end.

---

### Task 1: Public gate, blocking metadata, `x-cp-path` (master 8 deferral, 8.1 part; R8-2, R8-3)

**Files:** `proxy.ts` (`publicGate` without the redirects lookup, which Task 8 adds; matcher; header set and strip), `lib/seo/blocking-metadata.ts` (port), `next.config.ts` (`htmlLimitedBots: HTML_LIMITED_BOTS`, nothing else).

**Tests:** `tests/unit/proxy.test.ts` (R8-2 cases), the new preview-exit `?to` e2e in `tests/e2e/preview.spec.ts`, and the head-check half of `lighthouse-seo.spec.ts` (the Lighthouse half arrives in Task 14). `pnpm test:visual` 44/44.

**Commit:** `feat: add public proxy gate and blocking metadata`

---

### Task 2: JSON-LD on every page (master 8.1 part; R8-4)

**Files:**
- `components/seo/json-ld.tsx` and `lib/seo/json-ld.ts` (port);
- `components/site-extras.tsx` with the JSON-LD part only (consent and custom code arrive in Task 12), mounted in `app/(site)/layout.tsx` inside `<Suspense>`;
- the Article and Breadcrumb nodes in `app/(site)/{services,blog}/[slug]/page.tsx`;
- `templates/shared/structured-data.ts` (remove the "Phase 8 renders" note; fill any CP gap).

**Tests:** `tests/unit/seo/json-ld.test.ts`, `tests/unit/templates/structured-data.test.ts` (R8-4 cases), and the JSON-LD parse case in a new `tests/e2e/seo.spec.ts`. `public-literals` stays green. `pnpm test:visual` 44/44.

**Commit:** `feat: render cp json-ld`

---

### Task 3: OG cards in CP's brand (master 8.1 part; R8-5)

**Files:**
- `app/og/[kind]/[slug]/{route,card}.tsx`, `lib/seo/{og-card,share-image}.ts` and `server/modules/seo/queries.ts` (port the whole file: `getSiteOrigin`, `getOgSubject`, `ogSubjectTags`, `listSitemapEntries`);
- `assets/fonts/{barlow-latin-800-normal,roboto-latin-400-normal}.woff` and `LICENSE`;
- update `templates/shared/page-meta.ts` only if the image URL shape differs.

**Tests:** `tests/unit/seo/og-card.test.ts` and the colour-equality and no-SP-palette test, OG fetch cases in `seo.spec.ts`, and `tests/integration/queries/seo-queries.test.ts`. Open one generated card and look at it. `pnpm test:visual`.

**Commit:** `feat: add cp og share cards`

---

### Task 4: SEO API, checks and dashboard SEO score (master 8.1 API; R8-7)

**Files:**
- `server/modules/seo/{repo,service,routes}.ts`, mounted at `/seo` in `server/api/app.ts` in SP's order;
- `lib/seo/{checks,effective,internal-links}.ts` and `lib/schemas/api/seo.ts`;
- the Fix hrefs with `/admin/blog`;
- `server/modules/dashboard/{service,content-review}.ts` (seoHealth, `seoScore`, `contentHealth`, SEO QA).

**Tests:**
- unit: `tests/unit/seo/{checks,effective,internal-links}.test.ts`;
- integration: `tests/integration/api/{seo,seo-health,seo-usages-race}.test.ts`, covering per-record PUT, `seo:read`/`seo:update` 403s, `ogImage` keeping its `media_usages` row, and Fix hrefs;
- `dashboard.test.ts`: the `it.todo` restored (R8-7);
- `tests/dom/dashboard.test.tsx` stays green.

**Commit:** `feat: add seo api, checks and dashboard score`

---

### Task 5: SEO overview, record sheet and defaults screens (master 8.1 admin; R8-7)

**Files:**
- `app/(admin)/admin/(panel)/seo/{page,defaults/page}.tsx`;
- `components/admin/seo/{seo-overview,issues-list,alt-text-card,seo-sheet,seo-link,use-save-seo,keys,health,serp-preview,social-card,crawl-preview,seo-checklist,growth-meta,growth-settings-editor}.tsx|ts`.

**Tests:**
- DOM: `tests/dom/seo-overview.test.tsx`;
- e2e: the first half of `seo-admin.spec.ts` (overview → Needs work filter → open the sheet → save the title → the public `<title>` follows; defaults → robots mode).
- Take screenshots and look at them. Don't save baselines.

**Commit:** `feat: add seo overview and defaults screens`

---

### Task 6: SEO tab in the page, service and article editors (master 8.1, Phase 4 deferral; R8-7)

**Files:**
- `components/admin/seo/{seo-panel,editor-seo-tab,seo-meta}.tsx|ts`;
- the `seo` slot wired in `components/admin/{pages/page-editor,services/service-editor,articles/article-editor}.tsx` (remove the "arrives with 8.1" comments);
- `tests/unit/admin/resolve-widget.test.ts` (import `SEO_FIELDS_META`).

**Tests:**
- DOM: `tests/dom/seo-panel.test.tsx`;
- e2e: `seo-tab.spec.ts` against `/admin/pages/home`, a service and `/admin/blog/<id>`. A Fix link `?tab=seo` opens the tab, a save keeps the record version, and an unsaved-guard case.

**Commit:** `feat: add seo tab to editors`

---

### Task 7: Redirects module, CSV and restored `recordMove` (master 8.2 part 1; R8-8)

**Files:**
- `server/modules/redirects/{repo,service,routes}.ts`, mounted at `/redirects`, and `lib/schemas/api/redirects.ts`;
- `recordMove` calls in `server/modules/{services,articles}/service.ts`, with the markers removed.

**Tests:**
- integration: `tests/integration/api/{redirects,redirects-admin,redirects-csv}.test.ts` with CP paths;
- unit: `tests/unit/seo/redirects.test.ts`;
- the two `it.todo` markers restored in `collections.test.ts` and `articles.test.ts` (R8-8).

**Commit:** `feat: add redirects module and automatic moves`

---

### Task 8: Proxy redirects and real 404s (master 8.2 part 2; R8-9)

**Files:** `server/modules/redirects/resolve.ts` (`MISSING_PATH = "/_cp-missing"`, builder branch dropped with a 10.3 marker) and `proxy.ts` (`resolvePublicPath`, redirect with `waitUntil(recordHit)`, rewrite on missing). Run the R8-9 probe first and put its result in the report.

**Tests:**
- integration: `tests/integration/redirects/resolve.test.ts`;
- unit: `tests/unit/redirects-resolve.test.ts`;
- proxy unit cases for redirect, missing and fail-open;
- `public-404.spec.ts` with status 404 (R8-9);
- a `seo.spec.ts` case: rename a published service in the admin → the old URL 301s to the new one and the hit counter goes up.
- `pnpm test:visual` 44/44, including `/this-page-does-not-exist`.

**Commit:** `feat: resolve redirects and real 404s in the proxy`

---

### Task 9: Sitemap and robots (master 8.2 part 3; R8-10, R8-11)

**Files:** `app/sitemap.ts`, `app/robots.ts` and `lib/seo/sitemap.ts` (port).

**Tests:** `tests/unit/seo/{sitemap,robots,urls}.test.ts`, `tests/integration/queries/sitemap.test.ts` (19 URLs, draft and noindex absent), and an e2e: `/sitemap.xml` and `/robots.txt` return 200 with absolute CP URLs. `pnpm test:visual`.

**Commit:** `feat: add sitemap and robots`

---

### Task 10: Redirects screen and CSV dialogs (master 8.2 admin; R8-8)

**Files:** `app/(admin)/admin/(panel)/seo/redirects/page.tsx` and `components/admin/seo/{redirects-screen,redirect-dialog,redirect-import-dialog}.tsx`.

**Tests:**
- DOM: `tests/dom/redirects-screen.test.tsx`;
- e2e: the second half of `seo-admin.spec.ts` (create a redirect → visit it → 301 and the hit shown; the loop gets 422 inline; CSV export, then import with one bad row → per-row result).
- Take screenshots and look at them.

**Commit:** `feat: add redirects screen`

---

### Task 11: Marketing API and public reader (master 8.3 API; R8-12, R8-13)

**Files:** `server/modules/marketing/{service,routes,public}.ts`, mounted at `/marketing` (per-key permissions from `GROWTH_SETTINGS`; published-only `loadPublicMarketing`), `lib/schemas/api/marketing.ts`, and `lib/analytics/channel-status.ts`.

**Tests:** `tests/integration/api/marketing.test.ts` (customCode owner-only: admin and editor 403; tracking and consent follow `marketing`; draft/publish/restore; the revisions allow-list), `tests/integration/marketing/public.test.ts` (published only), and `tests/unit/analytics/channel-status.test.ts`.

**Commit:** `feat: add marketing settings api`

---

### Task 12: Consent banner, consent-gated tracking, events, custom code (master 8.3 public; R8-3, R8-12, R8-13)

**Files:**
- `components/consent/{consent-provider,consent-banner,consent-banner-view,tracking-scripts,route-tracker,route-change-event,custom-code}.tsx`, `components/attribution-capture.tsx` and `lib/analytics/{loaders,banner-preview-style}.ts`;
- the rest of `components/site-extras.tsx`;
- `app/(site)/layout.tsx` (mount `AttributionCapture`);
- `templates/shared/consent.ts` (remove the note).

**Tests:**
- the R8-12 DOM and unit list (banner, loaders, attribution capture, custom code), `consent-copy.test.ts`, and `public-literals` green;
- the R8-3 tracking-off e2e case in `seo.spec.ts`;
- `pnpm test:visual` 44/44.

**Commit:** `feat: add consent banner, tracking and custom code`

---

### Task 13: Marketing screens and e2e (master 8.3 admin; R8-12, R8-13)

**Files:** `app/(admin)/admin/(panel)/marketing/{page,consent/page,code/page,events/page}.tsx` and `components/admin/marketing/{tracking-editor,tracking-status,consent-editor,consent-preview,consent-preview.css,snippets-editor,events-view,notices}.tsx|css`, with CP copy.

**Tests:**
- the R8-12 admin DOM tests;
- e2e: `consent.spec.ts` (enable tracking → banner → reject → no tracker; accept → stubbed tracker loads; version bump → banner again; manage button), `custom-code.spec.ts` (R8-13), and restore tracking afterwards;
- take screenshots of each screen and look at them.

**Commit:** `feat: add marketing screens`

---

### Task 14: Attribution e2e and Lighthouse SEO 100 (master 8.3 deferral, 8.1 acceptance; R8-6, R8-14)

**Files:** `tests/e2e/leads.spec.ts` (replace the `8.3:` marker, R8-14) and `tests/e2e/lighthouse-seo.spec.ts` (the Lighthouse half). Fix any failing audit only as R8-6 allows.

**Tests:** these two, plus a full `pnpm test:e2e`.

**Commit:** `test: restore attribution e2e and add lighthouse seo gate`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```

Also confirm the gate's checks:
- `git grep -n -E "Phase 8|8\.2 records|^// 8\.3:" -- ':!docs' ':!server/db/migrations'` finds no deferral marker. The migrations are verbatim SP files, so their "Phase 8" headers stay. Comments that cite R8 rulings are fine; list any that are left.
- `git grep -n "it.todo" -- tests/integration/api/{collections,articles,dashboard}.test.ts` finds no Phase 8 todo.
- `git diff 21d478c -- docs/brief-inventory.json` is empty (the inventory is frozen).
- `git diff 21d478c -- tests/visual/__screenshots__` is empty (no baseline added or changed).
- `git diff 21d478c -- server/env.ts package.json pnpm-lock.yaml` is empty (no env, no deps).
- The report states the cut-over status from R8-8: the 8.2 blocker is cleared, and cut-over still waits for 9–11 and the owner.
