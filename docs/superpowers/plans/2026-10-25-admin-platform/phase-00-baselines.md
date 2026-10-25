# Phase 0: Baselines and inventory

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md`. Model: SP's `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-00-audit.md`. Never push.

**Goal:** Freeze today's public site as pixel baselines, and list every user-visible literal with the DB field it will become.

**Global constraints for this phase:**
- Public design frozen; nothing under `app/` or `components/` changes in this phase.
- Baselines at 1440×900 and 390×844, animations off, 0 px.
- Commits are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Branch, field inventory and brief (master 0.1)

**Files:**
- Create: `docs/brief-inventory.json`
- Create: `docs/brief.md`
- Create: `scripts/check-inventory.ts` (run with `pnpm dlx tsx`; no deps added in this phase)

**Interfaces:**
- Produces `docs/brief-inventory.json`, consumed by Task 3.2's leaf-path test and Task 3.4's literal test. Shape (same as SP's):

```json
{ "version": 1, "entries": [ {
  "id": "home.hero.heading",
  "source": "components/home/hero.tsx:24",
  "kind": "text",
  "value": "<exact literal>",
  "target": "pages.home.hero.heading",
  "pages": ["/"]
} ] }
```

- `kind` is one of `text | richText | image | alt | href | tel | mailto | list | aria | meta`.
- `target` roots, CP set (master Shared contracts):
  - `pages.(home|about|services|blog|contact|privacy|terms).…`
  - `services[<slug>].…`
  - `articles[<slug>].…`
  - `(team|clients|groupCompanies|categories|testimonials)[].…`
  - `settings.(site|contact|navigation|footer|sections.clients|sections.whyChooseUs|sections.contact|sections.map|sections.team|sections.testimonials|sections.howItWorks|seo.defaults|consent|tracking|customCode|microcopy|leads).…`
- Arrays (module constants such as `paragraphs`, `sectors`, `steps`; `lib/services.ts`; `lib/blog-posts.ts`) are recorded as follows:
  - one `kind:"list"` entry whose `value` is the item count;
  - one entry per distinct item field, e.g. `services[].overview[]`;
  - never one entry per item.
- Placement rule: a literal rendered on more than one page goes to its `settings.sections.*` key. A literal on one page goes to `pages.<key>`.
- Per-page overrides of a shared section (Contact title "Ways to Reach Us" on `/contact`) get their own `pages.contact.…` entry.

**Steps:**

- [ ] **Step 1: Create the branch**

```bash
git switch main && git status --short   # only ?? docs/superpowers/plans/ may appear
git rev-parse --short HEAD              # must print 3689369
git switch -c feat/dynamic-platform
git add docs/superpowers/plans
git commit -m "docs: add admin platform implementation plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If anything other than the plans dir shows in `git status`, stop and report. The baseline must be exactly `3689369`.

- [ ] **Step 2: Write the validator (the failing test)**

Port SP's `scripts/check-inventory.ts` (in SP at `scripts/check-inventory.ts`, plan text in SP phase-00 Task 1 Step 1). Change:
- `ROOTS` set to the CP roots above.
- Minimum entry count 150 → **200**: CP has 7 page types, 5 services and 7 articles.
- Add a check that every entry's `value` appears verbatim in its `source` file. For `kind:"list"` entries, check the array identifier instead. This makes stale line numbers fail.

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm dlx tsx scripts/check-inventory.ts`
Expected: FAIL with `ENOENT` on `docs/brief-inventory.json`.

- [ ] **Step 4: Build the inventory**

Read every `app/**/*.tsx` and `components/**/*.{ts,tsx}`, plus `lib/services.ts` and `lib/blog-posts.ts`. Skip `components/ui/**`, `components/motion/**` and `components/theme-provider.tsx`.

At minimum, cover:
- **Header and footer**
  - header top bar, nav labels and hrefs, CTA
  - footer: every column, group companies, legal links (`#` today), copyright
- **Home:** hero, clients, services, why choose us, testimonials, team, blog heading, contact, location map
- **About:** page hero, our story (eyebrow, title, paragraphs, sectors heading, sector chips, both images and alts, CTA), stats
- **Services:** page hero, grid heading and intro, "Not sure" card
- **Service detail:** per-service fields from `lib/services.ts`; labels in `service-overview.tsx`; `quote-card.tsx`; office hours; how it works (eyebrow, title, steps)
- **Blog:**
  - page hero, filter labels, search placeholder, featured label, pagination labels
  - per-article fields and body blocks
  - article labels: share, tags, related heading, sidebar headings
- **Contact:**
  - page hero and contact title override
  - quote form: heading, intro, next steps, urgent box, every label, placeholder and option, button, consent text
- **Metadata:** every `metadata` / `generateMetadata` export

Then sanity-check with:

```bash
grep -rnE '"[A-Z][^"]{3,}"|>[^<{]*[A-Za-z]{4,}[^<{]*<' app components lib/services.ts lib/blog-posts.ts --include=*.ts --include=*.tsx | grep -v components/ui
```

Every hit must be covered, or be a non-visible string (className, data attribute).

- [ ] **Step 5: Run the validator to verify it passes**

Run: `pnpm dlx tsx scripts/check-inventory.ts`
Expected: `inventory ok: <N> entries`, with N ≥ 200.

- [ ] **Step 6: Write `docs/brief.md`**

Sections, in order. Take the content from the CP spec and master plan; invent nothing.
1. Intent and goals (spec §1–2)
2. Owner decisions O1–O7 and builder calls B1–B12 (spec §5), with each B suffixed "(confirm or correct)"
3. Non-goals and anti-goals (spec §3–4)
4. Target architecture (master Architecture + SP's file tree, CP deltas)
5. Content model (spec §6.3 + master Shared contracts)
6. Page → template table (spec §6.2)
7. Phases (master phase list)
8. Owner-only steps (spec §10)
9. Field inventory summary: counts per page and per `kind`, plus "full list: `docs/brief-inventory.json`"
10. `## Changes`, an empty list header

- [ ] **Step 7: Commit**

```bash
git add docs/brief.md docs/brief-inventory.json scripts/check-inventory.ts
git commit -m "docs: add project brief and public-site field inventory

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Visual baseline harness (master 0.2)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/visual/urls.ts`
- Create: `tests/visual/freeze-motion.ts`
- Create: `tests/visual/public-pages.spec.ts`
- Modify: `package.json` (devDependency `@playwright/test@1.64.1`; scripts `test:visual` and `test:visual:update`)
- Modify: `.gitignore` (add `test-results/`, `playwright-report/`, `.data/`)
- Create (generated): `tests/visual/__screenshots__/**`

**Interfaces:**
- Produces:
  - `PUBLIC_URLS` (readonly literal tuple)
  - `freezeMotion(page: Page): Promise<void>`
  - screenshot names `<name>-<project>.png`, where `/` → `home` and `/services/medical-cleaning` → `services-medical-cleaning`

  Later phases import these and must not rename screenshots.
- Phase 1 replaces this phase's `webServer` with SP's standalone and seed command. Port and URL stay.

**Steps:**

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test@1.64.1
pnpm exec playwright install chromium
```

- [ ] **Step 2: URL list.** `tests/visual/urls.ts`, a literal copied from today's `lib/services.ts` and `lib/blog-posts.ts`:

```ts
// Every public URL that must stay pixel-identical. Literal on purpose:
// lib/services.ts and lib/blog-posts.ts are deleted in Phase 3.
export const PUBLIC_URLS = [
  "/",
  "/about",
  "/services",
  "/blog",
  "/contact",
  "/services/medical-cleaning",
  "/services/board-of-education",
  "/services/commercial-cleaning",
  "/services/retail-cleaning",
  "/services/ulv-fogging",
  "/blog/deep-cleaning-vs-regular-cleaning-what-your-business-needs",
  "/blog/5-signs-your-office-needs-a-professional-clean",
  "/blog/infection-control-cleaning-in-healthcare-settings",
  "/blog/how-to-get-stubborn-stains-out-of-curtains",
  "/blog/what-is-ulv-fogging-and-when-do-you-need-it",
  "/blog/keeping-schools-clean-through-term-and-holidays",
  "/blog/retail-cleaning-why-first-impressions-count",
  "/blog?category=Medical",
  "/blog?q=clean",
  "/this-page-does-not-exist",
] as const
```

Before committing, run `grep -n 'slug:' lib/services.ts lib/blog-posts.ts` and confirm the list matches exactly. The two `/blog?…` entries pin the filter and search states that Phase 3 makes DB-driven.

- [ ] **Step 3: freezeMotion.** Copy SP's `tests/visual/freeze-motion.ts` verbatim.

- [ ] **Step 4: Playwright config**

Copy SP's `playwright.config.ts` from SP phase-00 Task 2 Step 4 (the static-site version, not SP's current file), with these changes:
- `PORT` default 3200 (beside SP's 3100).
- Only the `desktop` and `mobile` projects.
- `snapshotPathTemplate` and `expect.toHaveScreenshot` exactly as SP.
- `webServer.command`: `` `pnpm build && pnpm start -p ${PORT}` ``.
- `reuseExistingServer: false`.

- [ ] **Step 5: The spec**

Copy SP phase-00's `tests/visual/public-pages.spec.ts`. Add the macOS guard from SP's current file:

```ts
test.skip(process.platform !== "darwin", "visual baselines are macOS-only")
```

`name(url)` must map query strings to safe names, so `/blog?category=Medical` → `blog-category-Medical`:

```ts
const name = (url: string) =>
  url === "/" ? "home" : url.slice(1).replaceAll(/[/?=&]/g, "-")
```

- [ ] **Step 6: Scripts and gitignore**

Add to `package.json` scripts:

```json
"test:visual": "playwright test tests/visual",
"test:visual:update": "playwright test tests/visual --update-snapshots"
```

Append to `.gitignore`: `test-results/`, `playwright-report/`, `.data/`.

- [ ] **Step 7: Generate baselines**

Run: `pnpm test:visual:update`
Expected: 40 tests pass, and 40 PNGs exist under `tests/visual/__screenshots__/`.

- [ ] **Step 8: Prove determinism**

Run: `pnpm test:visual` twice.
Expected: both runs PASS, 40/40, 0 px.

If a page flakes, fix the cause in `freezeMotion`. Likely causes:
- the GSAP intro (`data-intro`, `data-hero*`)
- Lenis
- the client-side `BlogList` hydration
- lazy map tiles

Then regenerate. Never mask CP's own content; there are no third-party iframes on CP pages. Record each fix in the report.

- [ ] **Step 9: Look at the baselines**

Open `home-desktop.png`, `blog-5-signs-your-office-needs-a-professional-clean-mobile.png` and `this-page-does-not-exist-desktop.png`. Confirm:
- the pages are fully rendered: no blank hero, no half-faded `data-reveal` elements, fonts loaded;
- the 404 shot is Next's default 404, recorded as-is.

- [ ] **Step 10: Commit**

```bash
git add playwright.config.ts tests/visual package.json pnpm-lock.yaml .gitignore
git commit -m "test: add visual baselines of the static public site

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase gate

`pnpm lint && pnpm typecheck && pnpm build && pnpm test:visual`: all green. `pnpm test` does not exist until Task 1.1.
