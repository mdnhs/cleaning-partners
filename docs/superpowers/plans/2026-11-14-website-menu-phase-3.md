# Website Menu — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One "Website" item in the admin sidebar holds every public page. Each page screen edits that page's own content and the shared sections and collections the page shows. Pages, Legal pages, Blog, Services, Careers and Collections leave the sidebar, and their old URLs redirect.

**Architecture:** A new isomorphic registry, `lib/admin/website.ts`, lists the Website screens (one per `PAGE_KEYS` page, plus Custom pages, Legal pages, and Header & footer). It also lists the *parts* each screen owns: settings keys, collections, and the existing list screens. Every part has exactly one home screen. A page that also shows a part homed elsewhere links to it under "Shared on this page". The screens reuse the existing editors unchanged (`PageEditor`, `SettingsEditor`, `CollectionScreen`, `ServicesScreen`, `ArticlesScreen`, `JobsScreen`, `LegalPagesScreen`). Fields added to a settings key, page template or collection therefore appear without changes here. The sidebar, the section rail, ⌘K and `permissionFor` keep reading `lib/admin/nav.ts`. Its Website item is built from the registry. A new `owns` field lets the Services, Blog, Careers and Custom pages children answer for the URLs that do not move (`/admin/services/*`, `/admin/blog/*`, `/admin/careers/*`, `/admin/pages/custom/*`).

**Tech Stack:** Next.js 16.3 App Router with Cache Components (rules: `docs/superpowers/notes/nextjs-16-api.md`. Read §0 and §7 before touching routes), React 19, TanStack Query, Vitest (projects `unit`, `dom`, `integration`), Playwright (projects `e2e`, `desktop`/`mobile` visual), lucide-react.

**Spec:** the user's request ("all the frontend pages kept inside one menu named Website, like James Whitfield's admin") plus the reference implementation at `/Users/nazmulhasansourab/ireland/james-whitfield`: `lib/admin/website.ts`, `lib/admin/nav.ts` (the `website` item), `app/(admin)/admin/(panel)/website/**`, `app/(admin)/admin/(panel)/{pages,collections}/**` (redirects), `tests/e2e/admin/navigation/website-menu.spec.ts`. This plan runs after Phase 2 (`docs/superpowers/plans/2026-11-14-dynamic-content-phase-2.md`). From Phase 2 it assumes only that settings keys and page templates may have gained fields or keys.

## Global Constraints

- Next 16: read `params`/`searchParams` only inside a `<Suspense>` child (every panel page already uses the `export default () => <Suspense><Inner/></Suspense>` shape; copy it). Do not use `export const dynamic`. `redirect`, `notFound` and `forbidden` come from `next/navigation`.
- `permissionFor` (`lib/admin/nav.ts`) stays the single source for page guards. Every panel page calls `requirePage(href)` first, except the redirect stubs for URLs that are no longer registered. Those call `requireActor()` before any `notFound()` (a stranger never learns which paths exist), then `requirePermission(...)`.
- `lib/admin/website.ts` is imported by the client sidebar. It may import **types only** from `@/templates/*` and `@/lib/schemas/api/collections`. Values come from `lib/admin/settings-keys.ts`, `lib/admin/page-labels.ts` and `lib/auth/permissions.ts`, which are already isomorphic.
- Redirects keep the query string (`?edit=<id>`, `?tab=seo`, `?status=…`, `?new=1`).
- Admin copy: sentence case, "&" in "Header & footer", no exclamation marks. Labels are the ones fixed in Task 1's tables.
- Commit after each task (Conventional Commits, as in `git log`). Do not push. Before pushing (user rule): `pnpm build` must succeed.
- Final gate (Task 6): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit 0. Run `pnpm test:e2e` and `pnpm test:visual` against a seeded local DB.

## Review Focus

1. **An author (article-only role) opens Website.** They should see the Website item with only Blog. `/admin/website` and `/admin/website/blog` should land on the Articles tab (`/admin/blog`), never a 403 page and never a redirect loop. Pinned in Task 1 (`websiteTabs`) and Task 2 (the `[key]` page test).
2. **An intake role (leads only) signs in.** Website is hidden, and Job applications is still reachable, now under Enquiries. Pinned in Task 4 (nav test) and the e2e `roles.spec.ts` update.
3. **An old deep link carries a query.** `/admin/collections/team?edit=<id>`, `/admin/pages/home?tab=seo` and `/admin/settings/footer?x=1` should land on the new screen with the same query. Pinned in Task 3.
4. **A wrong or misplaced segment.** `/admin/website/nope`, `/admin/website/home/footer` (a part from another screen) and `/admin/website/blog/articles` (a route-kind part, which lives at `/admin/blog`) should give a 404 after sign-in, never a 500. Pinned in Task 2.
5. **Phase 2 or later adds a settings key and nobody places it.** That key should not silently vanish from the admin. Pinned in Task 1: a test fails until every `EDITABLE_SETTINGS_KEYS` key is a Website part or listed in `SITE_SETTINGS_KEYS`.

---

## Placement decisions (Task 1 encodes these)

**Screens** (`WEBSITE_SCREENS`, rail order). The page screens follow `PAGE_KEYS` order (`home, about, services, blog, contact, careers`) with `PAGE_LABELS` labels:

| key | label | page | screen permission | kind |
|---|---|---|---|---|
| home | Home | home | `{ page: ["read"] }` | tabs |
| about | About | about | `{ page: ["read"] }` | tabs |
| services | Services | services | `{ page: ["read"] }` | tabs |
| blog | Blog | blog | `{ article: ["read"] }` (authors hold article:read but not page:read) | tabs |
| contact | Contact | contact | `{ page: ["read"] }` | tabs |
| careers | Careers | careers | `{ page: ["read"] }` | tabs |
| custom-pages | Custom pages | null | `{ page: ["read"] }` | custom-pages |
| legal | Legal pages | null | `{ page: ["read"] }` | legal |
| header-footer | Header & footer | null | `{ settings: ["read"] }` | tabs |

**Parts** (`WEBSITE_PARTS`, tab order within a screen). A screen with a page shows a "Page" tab first (id `page`, href `/admin/website/<key>`, needs `page:read`).

| id | screen | label | source | permission |
|---|---|---|---|---|
| clients-section | home | `SETTINGS_ENTRIES` label | settings `sections.clients` | entry `.read` |
| clients | home | Client logos | collection `clients` | `{ collection: ["read"] }` |
| why-choose-us | home | (entry label) | settings `sections.whyChooseUs` | entry `.read` |
| testimonials-section | home | (entry label) | settings `sections.testimonials` | entry `.read` |
| testimonials | home | Testimonials | collection `testimonials` | `{ collection: ["read"] }` |
| team-section | about | (entry label) | settings `sections.team` | entry `.read` |
| team | about | Team members | collection `team` | `{ collection: ["read"] }` |
| all-services | services | All services | route `/admin/services` | `{ service: ["read"] }` |
| how-it-works | services | (entry label) | settings `sections.howItWorks` | entry `.read` |
| articles | blog | Articles | route `/admin/blog` | `{ article: ["read"] }` |
| categories | blog | Categories | route `/admin/blog/categories` | `{ collection: ["read"] }` |
| contact-details | contact | (entry label) | settings `contact` | entry `.read` |
| contact-section | contact | (entry label) | settings `sections.contact` | entry `.read` |
| map | contact | (entry label) | settings `sections.map` | entry `.read` |
| jobs | careers | Jobs | route `/admin/careers` | `{ job: ["read"] }` |
| navigation | header-footer | (entry label) | settings `navigation` | entry `.read` |
| footer | header-footer | (entry label) | settings `footer` | entry `.read` |
| microcopy | header-footer | (entry label) | settings `microcopy` | entry `.read` |
| group-companies | header-footer | Group companies | collection `group-companies` | `{ collection: ["read"] }` |

Why these homes: a shared section lives on the first page that shows it as a main feature (Home for the clients, why-choose-us and testimonials sections). Team goes to About, contact and map go to Contact, and How it works goes to Services, because those are the pages named for them. Navigation, footer, group companies (footer logos) and microcopy (quote card, form labels, 404) appear on every page, so they live on Header & footer. `site`, `leads` and `careers` settings are identity and operations, not page content, so they stay in Site settings (`SITE_SETTINGS_KEYS`). Pages that show a part homed elsewhere list it under "Shared on this page" (`PAGE_SHOWS`, checked against `templates/*/view.ts`):

| page | shows (part ids) |
|---|---|
| home | clients-section, clients, all-services, why-choose-us, testimonials-section, testimonials, team-section, team, articles, contact-section, map |
| about | clients-section, clients, why-choose-us, team-section, team, testimonials-section, testimonials, contact-section |
| services | all-services, how-it-works, why-choose-us, clients-section, clients, testimonials-section, testimonials, contact-section, microcopy |
| blog | articles, categories, contact-section, microcopy |
| contact | contact-details, contact-section, map |
| careers | jobs, microcopy |

---

### Task 1: Website registry

**Files:**
- Create: `lib/admin/website.ts`
- Test: `tests/unit/admin/website.test.ts`

**Interfaces:**
- Consumes: `EDITABLE_SETTINGS_KEYS`, `EditableSettingsKey`, `SETTINGS_ENTRIES` (`lib/admin/settings-keys.ts`); `PAGE_LABELS` (`lib/admin/page-labels.ts`); `hasPermission`, `PermissionRequest` (`lib/auth/permissions.ts`); types `PageKey` (`@/templates/registry`) and `CollectionName` (`@/lib/schemas/api/collections`).
- Produces:
  - `type WebsiteKey = "home" | "about" | "services" | "blog" | "contact" | "careers" | "custom-pages" | "legal" | "header-footer"`
  - `type WebsiteScreen = { key: WebsiteKey; label: string; page: PageKey | null; permission: PermissionRequest; kind: "tabs" | "custom-pages" | "legal" }`
  - `type WebsitePartSource = { kind: "settings"; key: EditableSettingsKey } | { kind: "collection"; name: CollectionName } | { kind: "route"; href: string }`
  - `type WebsitePart = { id: string; screen: WebsiteKey; label: string; source: WebsitePartSource; permission: PermissionRequest }`
  - `type WebsiteTab = { id: string; label: string; href: string }`
  - `const WEBSITE_SCREENS: readonly WebsiteScreen[]`, `const WEBSITE_PARTS: readonly WebsitePart[]`, `const PAGE_SHOWS: Record<PageKey, readonly string[]>`, `const SITE_SETTINGS_KEYS = ["site", "leads", "careers"] as const`
  - `isWebsiteKey(value: string): value is WebsiteKey`
  - `websiteHref(key: WebsiteKey): string` → `/admin/website/<key>`
  - `websitePart(screen: WebsiteKey, id: string): WebsitePart | undefined`
  - `partHref(part: WebsitePart): string`: route parts return `source.href`, others `/admin/website/<screen>/<id>`
  - `websiteTabs(screen: WebsiteKey, roles: readonly string[]): WebsiteTab[]`: the Page tab first when the screen has a page and roles hold `page:read`, then the readable parts in table order
  - `sharedOnPage(page: PageKey, roles: readonly string[]): (WebsiteTab & { screenLabel: string })[]`: `PAGE_SHOWS[page]` parts whose screen is not `page`, readable by `roles`
  - `isWebsiteSettingsKey(key: string): boolean`
  - `adminHrefForSettings(key: EditableSettingsKey): string`: the part href if moved, else `/admin/settings/<key>`
  - `adminHrefForCollection(name: CollectionName): string`: the part href (`categories` → `/admin/blog/categories`)
  - `backLinkForBuilderPage(page: { legalOrder: number | null }): { href: string; label: string }`: null → Custom pages, number → Legal pages
  - `withSearch(href: string, search: Record<string, string | string[] | undefined>): string`

- [ ] **Step 1: Write the failing tests** in `tests/unit/admin/website.test.ts`:
  - `"lists one page screen per PAGE_KEYS page, in order, then custom-pages, legal, header-footer"`: `WEBSITE_SCREENS.map(s => s.key)` equals `[...PAGE_KEYS, "custom-pages", "legal", "header-footer"]` (import `PAGE_KEYS` from `@/templates/registry` in the test only), and each page screen's label equals `PAGE_LABELS[key]`.
  - `"places every editable settings key exactly once"`: for each `EDITABLE_SETTINGS_KEYS` key, `isWebsiteSettingsKey(key) !== SITE_SETTINGS_KEYS.includes(key)`. Also, the settings parts have no duplicate keys.
  - `"homes every collection"`: for each `COLLECTIONS` name, `adminHrefForCollection(name)` starts with `/admin/website/` or equals `/admin/blog/categories`.
  - `"part ids are unique and every PAGE_SHOWS id is a part"`, and `"a page-screen part is listed in its own page's PAGE_SHOWS"`.
  - `"hrefs"`: `websiteHref("home")` is `/admin/website/home`, `partHref(websitePart("home","testimonials")!)` is `/admin/website/home/testimonials`, and `partHref(websitePart("services","all-services")!)` is `/admin/services`. Also `adminHrefForSettings("footer")` is `/admin/website/header-footer/footer` and `adminHrefForSettings("site")` is `/admin/settings/site`.
  - `"websiteTabs by role"`: owner on `home` gets `["page","clients-section","clients","why-choose-us","testimonials-section","testimonials"]`; author on `blog` gets `["articles"]`; marketer on `home` gets `["page"]`; intake on `home` gets `[]`.
  - `"sharedOnPage lists parts homed elsewhere"`: owner on `about` includes `{ id: "testimonials", href: "/admin/website/home/testimonials", screenLabel: "Home" }` and excludes `team`.
  - `"backLinkForBuilderPage"`: `{ legalOrder: null }` gives `{ href: "/admin/website/custom-pages", label: "Custom pages" }`, and `{ legalOrder: 2 }` gives `{ href: "/admin/website/legal", label: "Legal pages" }`.
  - `"withSearch keeps the query"`: `withSearch("/a", { edit: "x", tag: ["1","2"], none: undefined })` is `/a?edit=x&tag=1&tag=2`, and `withSearch("/a", {})` is `/a`.
- [ ] **Step 2: Run it to see it fail.** `pnpm vitest run tests/unit/admin/website.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement `lib/admin/website.ts`** from the Placement tables. Hard-code the six page keys in `WEBSITE_SCREENS` (type-only `PageKey` import). The first test checks them against `PAGE_KEYS`. Settings part labels read `SETTINGS_ENTRIES[key].label`.
- [ ] **Step 4: Run it to see it pass.** Same command → PASS. Then `pnpm typecheck` → exit 0.
- [ ] **Step 5: Commit.** `git commit -m "feat(admin): website registry of page screens and their parts"`

### Task 2: Website screens and the Website nav item

**Files:**
- Modify: `lib/admin/nav.ts` (add the `website` item. ⌘K lists Website parts.)
- Create: `components/admin/website/website-tabs.tsx` (`WebsiteTabs`, `SharedOnPage`)
- Create: `app/(admin)/admin/(panel)/website/page.tsx` (index → first visible child)
- Create: `app/(admin)/admin/(panel)/website/[key]/page.tsx`
- Create: `app/(admin)/admin/(panel)/website/[key]/[part]/page.tsx`
- Modify: `components/admin/pages/page-editor.tsx:51-52` (drop `backHref`/`backLabel`. The Website rail and tabs give the context.)
- Test: `tests/unit/admin/website-pages.test.tsx` (server pages, mocked as in `tests/unit/admin/b3-panel-pages.test.tsx`), `tests/dom/website-tabs.test.tsx`, `tests/unit/admin/nav-registry.test.ts`, `tests/unit/admin/nav.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces. `firstVisibleChild(id, roles)`, `requirePage`, `requirePermission`, `forbidden`. `SECTION_TAB`/`SECTION_TAB_ACTIVE` (`components/admin/section-tabs/section-tabs.tsx`). `useAdminSession().roles`.
- Produces:
  - nav item `{ id: "website", group: "menu", label: "Website", href: "/admin/website", icon: Globe, permission: null, match: "prefix", keywords: ["pages", "home page", "about", "contact", "builder", "sections", "collections", "footer", "navigation"] }`, placed after Dashboard. Its children are `WEBSITE_SCREENS.map(s => ({ id: \`website-${s.key}\`, label: s.label, href: websiteHref(s.key), permission: s.permission, keywords: <labels of the screen's parts> }))`.
  - `reachableLinks` also yields each non-route Website part the roles may read: `{ id: \`website-${screen}-${part}\`, label: part.label, href: partHref(part), parent: <screen label>, parentKeywords: [], icon: Globe }`.
  - `<WebsiteTabs screen={WebsiteKey} />`: a client `nav` with `aria-label="<screen label> sections"`. It renders a horizontal row of links (classes `SECTION_TAB`, active `SECTION_TAB_ACTIVE`, `aria-current="page"` on the longest-prefix match of `usePathname()`), and renders nothing when there are fewer than 2 tabs.
  - `<SharedOnPage page={PageKey} />`: a client `section` with heading "Shared on this page". It lists `sharedOnPage` links as "<label> · edited on <screenLabel>", and renders nothing when the list is empty.

- [ ] **Step 1: Write the failing server-page tests** in `tests/unit/admin/website-pages.test.tsx` (mock `next/navigation` and `@/server/auth/session` as b3 does, adding `requireActor`. Mock the editors to `() => null`):
  - `/admin/website` as owner → `REDIRECT /admin/website/home`. As author → `REDIRECT /admin/website/blog`. With no visible child → `FORBIDDEN`.
  - `[key]` with `home` as owner renders (no throw) and calls `requirePage("/admin/website/home")`. `blog` as author → `REDIRECT /admin/blog`. `nope` → `NOT_FOUND` after `requirePage("/admin/website/nope")`. `header-footer` as owner → `REDIRECT /admin/website/header-footer/navigation`.
  - `[key]/[part]`: `home/testimonials` renders and calls `requirePermission({ collection: ["read"] })`. `home/footer` → `NOT_FOUND`. `blog/articles` → `NOT_FOUND` (route part). `about/team-section` calls `requirePermission(SETTINGS_ENTRIES["sections.team"].read)`.
- [ ] **Step 2: Run them to see them fail.** `pnpm vitest run tests/unit/admin/website-pages.test.tsx` → FAIL (routes missing).
- [ ] **Step 3: Add the `website` item to `NAV_ITEMS`** and the part links to `reachableLinks`. Add nav tests: `"Website lists its screens from the registry"` (children ids equal `WEBSITE_SCREENS.map(s => \`website-${s.key}\`)`), `"author sees Website › Blog only"`, `"⌘K finds Testimonials in Home"` (`reachableLinks(["owner"])` has label `Testimonials`, parent `Home`, href `/admin/website/home/testimonials`), and `permissionFor("/admin/website/blog")` equals `{ article: ["read"] }`. Update `"registers the spec's item ids in order"` for the new id. Run `pnpm vitest run tests/unit/admin/nav-registry.test.ts tests/unit/admin/nav.test.ts` → PASS.
- [ ] **Step 4: Implement the three routes.**
  - Index: `requirePage("/admin/website")`, then `firstVisibleChild("website", actor.roles)`, else `forbidden()`.
  - `[key]`: `requirePage(\`/admin/website/${key}\`)`. If `!isWebsiteKey(key)` or the screen kind is not `tabs`, call `notFound()`. Compute `websiteTabs`: if empty, `forbidden()`. If the first tab is not `page`, `redirect(tabs[0].href)`. Otherwise render `<WebsiteTabs/>`, `<SharedOnPage/>` and `<PageEditor pageKey origin={await getSiteOrigin()}/>`.
  - `[part]`: same guard. If `websitePart(key, part)` is missing or a route part, call `notFound()`. Then `requirePermission(part.permission)` and render `<WebsiteTabs/>` plus `<SettingsEditor settingsKey/>` or `<CollectionScreen name/>`.
  - `generateMetadata` titles: the screen label, and for a part the part label. Run Step 1's tests → PASS.
- [ ] **Step 5: Write `tests/dom/website-tabs.test.tsx`** (pattern: `tests/dom/section-rail.test.tsx`):
  - owner at `/admin/website/home/testimonials`: the nav "Home sections" has 6 links and "Testimonials" has `aria-current="page"`.
  - author at `/admin/blog`: nothing is rendered (1 tab).
  - owner at `/admin/blog/categories`: "Categories" is current, not "Articles".
  - `SharedOnPage` for `about`: it lists "Testimonials · edited on Home" linking to `/admin/website/home/testimonials`.

  Implement `website-tabs.tsx`. Run `pnpm vitest run tests/dom/website-tabs.test.tsx` → PASS.
- [ ] **Step 6: Drop the back link from `PageEditor`.** Update `tests/dom/versioned-editor.test.tsx` and `tests/dom/editor-layout.test.tsx` only where they assert "All pages". Then run `pnpm vitest run --project dom` → PASS.
- [ ] **Step 7: Check in the browser.** Run `pnpm dev`, sign in as owner, and open `/admin/website/home`. The rail should list the 9 screens. The tab row should show Page plus 5 parts. Editing "Testimonials section" and publishing should succeed. On `/admin/website/about`, "Shared on this page" should list the Home parts. (At this point the old sidebar items are still there. Visual baselines are regenerated in Task 4. Do not update them here.)
- [ ] **Step 8: Commit.** `git commit -m "feat(admin): Website screens combining each page with its sections"`

### Task 3: Custom pages and Legal pages screens; redirects from the old URLs

**Files:**
- Create: `components/admin/website/custom-pages-screen.tsx` (`CustomPagesScreen`: the "Custom pages" section, the New page button and the `?new=1` dialog, moved out of `components/admin/pages/pages-list.tsx`)
- Delete: `components/admin/pages/pages-list.tsx`. Rename `tests/dom/pages-list.test.tsx` → `tests/dom/custom-pages-screen.test.tsx`, dropping the site-pages cases.
- Create: `app/(admin)/admin/(panel)/website/custom-pages/page.tsx`, `app/(admin)/admin/(panel)/website/legal/page.tsx` (`requirePage` with their own href. The headers move from `pages/page.tsx` / `pages/legal/page.tsx`.)
- Modify: `components/admin/builder/page-builder.tsx:464-467` (first breadcrumb = `backLinkForBuilderPage(record)`)
- Replace with redirect stubs: `app/(admin)/admin/(panel)/pages/page.tsx`, `pages/[key]/page.tsx`, `pages/legal/page.tsx`, `collections/page.tsx`
- Delete: `collections/{team,clients,testimonials,group-companies}/page.tsx`. Create: `collections/[name]/page.tsx`.
- Modify: `app/(admin)/admin/(panel)/settings/[key]/page.tsx` (moved keys redirect)
- Test: `tests/unit/admin/website-redirects.test.tsx`, `tests/unit/admin/b3-panel-pages.test.tsx`, `tests/dom/page-builder.test.tsx`

**Interfaces:**
- Consumes: `withSearch`, `websiteHref`, `adminHrefForCollection`, `adminHrefForSettings`, `isWebsiteSettingsKey`, `backLinkForBuilderPage`, `isWebsiteKey` (Task 1). `requireActor`, `requirePermission`. `isPageKey`, `COLLECTIONS`.
- Produces: the redirect table below (all 307, query kept):

| from | guard (in order) | to |
|---|---|---|
| `/admin/pages` | `requireActor` | `/admin/website` |
| `/admin/pages/<key>` | `requireActor`, `isPageKey` else 404, `{ page: ["read"] }` | `/admin/website/<key>` |
| `/admin/pages/legal` | `requireActor`, `{ page: ["read"] }` | `/admin/website/legal` |
| `/admin/collections` | `requireActor` | `/admin/website` |
| `/admin/collections/<name>` | `requireActor`, name in `COLLECTIONS` else 404, `{ collection: ["read"] }` | `adminHrefForCollection(name)` |
| `/admin/settings/<moved key>` | existing guards, then `SETTINGS_ENTRIES[key].read` | `adminHrefForSettings(key)` |

- [ ] **Step 1: Write the failing redirect tests** in `tests/unit/admin/website-redirects.test.tsx`, one `it` per table row plus:
  - `/admin/pages/home` with `{ tab: "seo" }` → `REDIRECT /admin/website/home?tab=seo`
  - `/admin/collections/team` with `{ edit: "abc" }` → `REDIRECT /admin/website/about/team?edit=abc`
  - `/admin/collections/nope` → `NOT_FOUND` and `requireActor` called first
  - `/admin/settings/site` still renders (not moved)

  Run `pnpm vitest run tests/unit/admin/website-redirects.test.tsx` → FAIL.
- [ ] **Step 2: Write the stubs and the `settings/[key]` change.** Use the stub shape from `/Users/nazmulhasansourab/ireland/james-whitfield/app/(admin)/admin/(panel)/collections/[name]/page.tsx`, plus `searchParams`. Update `b3-panel-pages.test.tsx` (add `requireActor` to its mock, then change the `settings/[key]` expectations for moved keys to redirects). Run both test files → PASS.
- [ ] **Step 3: Extract `CustomPagesScreen` and add the two Website routes.** Point the builder breadcrumb at `backLinkForBuilderPage`. In `tests/dom/page-builder.test.tsx`, a custom page's first crumb is "Custom pages" → `/admin/website/custom-pages`, and a legal page's (`legalOrder: 0`) is "Legal pages" → `/admin/website/legal`. Run `pnpm vitest run --project dom` → PASS.
- [ ] **Step 4: Typecheck.** `pnpm typecheck` → exit 0 (typed routes regenerate on `pnpm dev`/`build`. Run `pnpm next typegen` first if `PageProps<"/admin/website/[key]/[part]">` is unknown).
- [ ] **Step 5: Commit.** `git commit -m "feat(admin): custom and legal pages under Website; old page, collection and settings URLs redirect"`

### Task 4: Swap the sidebar to Website

**Files:**
- Modify: `lib/admin/nav.ts`:
  - `NavLink.owns?: readonly { href: string; permission: PermissionRequest }[]`. `matchLength`, `activeChild` and `REGISTERED` treat each `owns` entry like a prefix link carrying its own permission.
  - Remove the items `pages`, `legal-pages`, `blog`, `services`, `careers` and `collections`, along with the `collection()` helper if it is unused.
  - Website children own these: `services` owns `/admin/services` (service:read); `blog` owns `/admin/blog` (article:read) and `/admin/blog/categories` (collection:read); `careers` owns `/admin/careers` (job:read); `custom-pages` owns `/admin/pages/custom` (page:read).
  - `leads` gains the children `[{ id: "leads-enquiries", label: "Enquiries", href: "/admin/leads", permission: { lead: ["read"] } }, { id: "leads-applications", label: "Job applications", href: "/admin/careers/applications", permission: { lead: ["read"] }, icon: FileUser, keywords: ["applicants", "cv", "candidates"] }]`.
  - The `settings` children come from `EDITABLE_SETTINGS_KEYS.filter(k => !isWebsiteSettingsKey(k))`, and its keywords drop "contact", "footer" and "navigation".
- Modify: `lib/admin/settings-keys.ts` descriptions that say "under Collections" (→ "under Client logos", "under Testimonials", "under Team members").
- Modify: `app/(admin)/admin/(panel)/{services,blog,blog/categories,careers}/page.tsx` (render `<WebsiteTabs screen=…/>` above the existing screen. `requirePage` hrefs stay.)
- Test: `tests/unit/admin/nav-registry.test.ts`, `tests/unit/admin/nav.test.ts`, `tests/dom/admin-shell.test.tsx`, `tests/dom/command-palette.test.tsx`, `tests/dom/section-rail.test.tsx`, `tests/e2e/website-menu.spec.ts` (new), `tests/e2e/admin-layout.spec.ts`, `tests/e2e/roles.spec.ts`, and every other `tests/e2e/*.spec.ts` / `tests/visual/*.spec.ts` that `grep -lE "admin/(pages|collections)|\"(Pages|Collections)\""` finds, plus `tests/visual/__screenshots__/*`.

**Interfaces:**
- Consumes: Task 1 and Task 2 exports. `WebsiteTabs`.
- Produces: the final sidebar. Menu: Dashboard, Website, Media, Enquiries. Growth: SEO, Marketing. General: Appearance, Site settings. Dock: Users & roles, Activity log. `permissionFor` results: `/admin/services/x` → `{ service: ["read"] }`, `/admin/blog/categories` → `{ collection: ["read"] }`, `/admin/careers/applications/x` → `{ lead: ["read"] }`, `/admin/careers/new` → `{ job: ["read"] }`, `/admin/pages/custom/x` → `{ page: ["read"] }`, `/admin/pages` → `undefined`, `/admin/collections/team` → `undefined`.

- [ ] **Step 1: Rewrite the failing nav tests.**
  - Replace `"Blog holds Articles and Categories; Collections the rest"`, `"Testimonials is a Collections child…"` and `"the Pages item carries the builder keywords…"` with:
    - `"no Pages, Legal pages, Blog, Services, Careers or Collections item"`
    - `"owned paths resolve to the owner's permission"` (the Produces list above)
    - `"activeItem: owned paths select Website and the owning child"` (`/admin/services/x` → website/website-services; `/admin/blog/categories` → website/website-blog; `/admin/careers/applications/x` → leads/leads-applications)
    - `"intake sees Enquiries with Job applications and no Website"`
    - `"Site settings lists Identity, Enquiries, Job applications, AI assistant, Integrations"`
  - Update the "item ids in order" test.

  Run `pnpm vitest run tests/unit/admin` → FAIL.
- [ ] **Step 2: Make the nav changes** and the settings-keys copy change. Run `pnpm vitest run tests/unit/admin` → PASS.
- [ ] **Step 3: Add `<WebsiteTabs/>` to the four list routes.** Update the DOM shell, palette and rail tests that name "Pages"/"Collections"/"Testimonials, in Collections" (→ "Testimonials, in Home"). Run `pnpm vitest run --project dom` → PASS.
- [ ] **Step 4: Write `tests/e2e/website-menu.spec.ts`** (sign-in and IP header pattern from `tests/e2e/admin-layout.spec.ts`, owner, 1440×900):
  - `"the sidebar offers Website, not Pages or Collections"`: in the navigation "Admin" (exact), the link `/^Website/` is visible, and the `/^Pages/`, `/^Collections/`, `/^Blog/`, `/^Services/` and `/^Careers/` links each have count 0.
  - `"the Website rail lists every screen"`: on `/admin/website/home`, the navigation "Website" has the links Home, About, Services, Blog, Contact, Careers, Custom pages, Legal pages, Header & footer.
  - one `test` per moved URL: `/admin/pages` → `/\/admin\/website\/home$/`; `/admin/pages/about` → `/\/admin\/website\/about$/`; `/admin/pages/legal` → `/\/admin\/website\/legal$/`; `/admin/collections/testimonials` → `/\/admin\/website\/home\/testimonials$/`; `/admin/settings/footer` → `/\/admin\/website\/header-footer\/footer$/`; `/admin/collections/team?edit=x` → URL contains `/admin/website/about/team?edit=x`.
  - `"Services keeps Website highlighted"`: on `/admin/services`, the "Website" sidebar link has `aria-current` and the tab "All services" is current.
- [ ] **Step 5: Update the existing e2e specs.**
  - `admin-layout.spec.ts`: the labels list becomes Dashboard, Website, Media, Enquiries, and the ⌘K option becomes "Testimonials, in Home".
  - `roles.spec.ts` `SCREENS`: `/admin/pages` → `/admin/website/home` (page:read). Add `/admin/website/header-footer/navigation` (settings:read) and `/admin/careers/applications` (lead:read).
  - Other specs: replace old URLs with the new ones.

  Run `pnpm test:e2e` → all pass.
- [ ] **Step 6: Regenerate the visual baselines.** Update the URLs and headings in `tests/visual/admin-screens.spec.ts`: `/admin/pages` → `/admin/website/custom-pages` with heading "Custom pages", `/admin/pages/home` → `/admin/website/home`, the `navigation "Collections"` checks → `navigation "Home sections"`/`"About sections"`, and `/admin/settings/contact` → `/admin/website/contact/contact-details`. Run `pnpm test:visual:update`. Then open the changed PNGs in `tests/visual/__screenshots__/` and confirm the only differences are the sidebar, the Website rail, the tab row and the moved screens. Run `pnpm test:visual` → pass.
- [ ] **Step 7: Commit.** `git commit -m "feat(admin): Website replaces Pages, Blog, Services, Careers and Collections in the sidebar"`

### Task 5: Deep links point at the Website screens

**Files:**
- Modify: `server/modules/search/service.ts:44,95,103,119` (`websiteHref(key)`, `adminHrefForCollection(name) + "?edit=" + id`)
- Modify: `server/modules/media/service.ts:464-489` (page → `websiteHref`, settings → `adminHrefForSettings`, team/client/groupCompany → `adminHrefForCollection(...)?edit=`)
- Modify: `server/modules/seo/service.ts:169` (`FIX_BASE.page` → `/admin/website`)
- Modify: `lib/content/qa.ts:122,129` (`adminHrefForSettings` for editable keys, `websiteHref(page.key)`)
- Modify: `components/admin/dashboard/dashboard.tsx:45` (`/admin/website`), `components/admin/design/sample-data.ts:37` (`/admin/website`), `components/admin/shell/palette-actions.ts:78` (`/admin/website/custom-pages?new=1`)
- Modify: `components/admin/help/help-view.tsx` lines 61-133, 182-184 and 294-296. The copy names the new places: "Open Website and choose the page…", "Website, Custom pages", "Website, Home, Testimonials", "Website, About, Team members", "Website, Header & footer, Group companies", "Website, Contact, Contact details", "Applications arrive under Enquiries, Job applications".
- Test: `tests/integration/api/search.test.ts`, `tests/integration/api/media-manage.test.ts`, `tests/integration/api/seo-health.test.ts`, `tests/integration/api/dashboard.test.ts`, `tests/unit/content/qa.test.ts`, `tests/unit/admin/palette-actions.test.ts`, `tests/dom/dashboard.test.tsx`, `tests/unit/admin/help-topics.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers. These are all server or isomorphic imports of `lib/admin/website.ts`.
- Produces: no admin-generated link points at `/admin/pages/<key>`, `/admin/pages` (bare), `/admin/collections/*` or a moved `/admin/settings/<key>`.

- [ ] **Step 1: Change the expected hrefs first** in the listed tests:
  - search: the page hit is `/admin/website/home`, and team is `/admin/website/about/team?edit=<id>`
  - media usage: `sections.whyChooseUs` → `/admin/website/home/why-choose-us`
  - seo-health: a page fixHref is `/admin/website/home?tab=seo`
  - qa: settings `navigation` → `/admin/website/header-footer/navigation`
  - palette: `/admin/website/custom-pages?new=1`
  - dashboard: `/admin/website`

  Run `pnpm vitest run tests/unit tests/dom` and `pnpm test:integration` → the changed cases FAIL.
- [ ] **Step 2: Update the sources.** Re-run → PASS.
- [ ] **Step 3: Add a guard test** to `tests/unit/admin/website.test.ts`, `"no source builds a moved admin URL"`. It reads `server/**/*.ts`, `lib/**/*.ts` and `components/**/*.tsx` with `globSync` (pattern from `tests/unit/admin/help-topics.test.ts`) and expects no match for ``/["'`]\/admin\/(pages(["'`?]|\/\$\{)|collections\/)/``. Run → PASS.
- [ ] **Step 4: Commit.** `git commit -m "fix(admin): deep links open the Website screens"`

### Task 6: Full verification

**Files:** none beyond fixes the checks demand.

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm test` → all exit 0.
- [ ] **Step 2:** `pnpm test:e2e` and `pnpm test:visual` on a seeded DB → all pass.
- [ ] **Step 3:** `pnpm build` → exit 0, with no "uncaught runtime data during prerendering" error for `/admin/website/*`.
- [ ] **Step 4:** Spot-check in `pnpm dev`. As editor: Website › Header & footer › Navigation saves and publishes. As author: Website shows only Blog, which opens Articles. As intake: Enquiries › Job applications opens. As marketer: Website › Home shows the Page editor with no tab row.
- [ ] **Step 5:** If any fix commits were made, they use `fix(admin): …`. Do not push.
