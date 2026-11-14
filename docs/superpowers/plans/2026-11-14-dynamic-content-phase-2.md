# Dynamic Content — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the 2026-11-13 audit: every public string, link and logo comes from the admin, and the reusable pieces (quote button, quote card, page hero, steps section, icon-cards section, membership logo, contact cards) each have one shared schema shape and one source.

**Architecture:** Same pipeline as Phase 1: Zod schema (`lib/schemas/common.ts` for shared shapes) → admin editor meta → seed fixture → hand-written data migration (`server/db/migrations/00NN_*.sql` + `_journal.json`) → view mapper (`templates/**`, `templates/shared/views.ts`) → component. The quote button becomes two Settings › Contact values used as `{quoteLabel}` / `{quoteHref}` placeholders, so it rides on the existing placeholder machinery (`lib/link-rules.ts`, `lib/interpolate.ts`) and any place can still type its own label. Duplicate components merge into `StepsSection` and `IconCardsSection` with a variant prop that reproduces each old markup verbatim.

**Tech Stack:** Next.js 16.3 (rules in `docs/superpowers/notes/nextjs-16-api.md`; no routing files change in this plan), Zod 4, Drizzle 0.45 + Postgres, Vitest (unit / dom / integration), Playwright (e2e + `tests/visual`), Tailwind 4.

**Spec:** the audit findings and the Phase 2 brief in this session (no separate spec file); Phase 1 plan `docs/superpowers/plans/2026-11-13-dynamic-content-phase-1.md` is the model and its Global Constraints carry over.

## Global Constraints

- Every data migration updates `draft` and `published` (`published` only `WHERE "published" IS NOT NULL`), is re-runnable, and never overwrites a value the admin changed: seeded values are matched exactly before being rewritten; a renamed/moved field carries its stored value over verbatim.
- File names `00NN_snake_name.sql`, statements split by `--> statement-breakpoint`, one `_journal.json` entry each (`idx`, `version: "7"`, `when` = previous + 10000000, `tag`, `breakpoints: true`). Numbers are fixed per task below, starting at `0035` (`when` 1793860000000).
- A migration that adds a **required** key also adds it to that entity's `revisions."data"` rows (`entity_type` `'page'`/`'settings'`, `entity_id` = key; pattern `0013_seo_defaults_robots.sql`), so restoring an old version still validates. Extra stale keys need no revision rewrite (objects strip unknown keys).
- When a changed shape is reused by a page-builder block (`blocks/registry.ts`: `hero` = `homeTemplate.shape.hero`, `services` = home `services` / services `grid`, `hero.page`), the migration also rewrites matching blocks in `builder_pages."draft"` and `"published"` (`-> 'blocks'`), bumping `"version"` on changed rows (pattern `0020_remove_newsletter.sql`). Per-element JSON transforms use a `CREATE OR REPLACE FUNCTION pg_temp.<name>(jsonb) RETURNS jsonb` declared at the top of the migration (session-scoped; nothing is left in the schema).
- When a media reference moves or disappears, the migration fixes `media_usages` (`entity_type` `'page'`, `'settings'`, `'builder-page'`; `field` is the dot path, e.g. `hero.memberLogo`, `blocks.0.data.image`); inserts use `gen_random_uuid()` and `ON CONFLICT ON CONSTRAINT media_usages_unique DO NOTHING` (pattern `0026`).
- Every migration test (`tests/integration/db/<name>-migration.test.ts`, pattern `footer-login-migration.test.ts`) covers: seeded value rewritten in draft and published; admin-edited value kept; `published` NULL stays NULL; second run is a no-op; **and the migrated `draft`/`published` parse with the current schema** (`settingsSchemas[key]` / `templates[PAGES[key]].schema` / `BlockInstance`).
- Seed fixtures (`server/db/seed/fixtures/*`) parse with the new schemas; `server/db/seed/fixtures/sources.ts` stays the views' test oracle.
- Frozen public components: after editing, adding or deleting any file under `components/{home,about,services,contact,blog}`, refresh `tests/unit/blocks/frozen-components.json` with (pass the changed/new files; deleted files drop out):
  `node -e 'const fs=require("fs"),c=require("crypto"),p="tests/unit/blocks/frozen-components.json",j=JSON.parse(fs.readFileSync(p,"utf8"));for(const f of Object.keys(j.files))if(!fs.existsSync(f))delete j.files[f];for(const f of process.argv.slice(1))j.files[f]=c.createHash("sha256").update(fs.readFileSync(f)).digest("hex");j.files=Object.fromEntries(Object.entries(j.files).sort());fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")' <files>`
- Visual baselines (`tests/visual/public-pages.spec.ts` over `tests/visual/urls.ts`, plus `builder-pages.spec.ts`, `builder-copy.spec.ts`): run `pnpm test:visual`. A task that states "identical" must pass without updating. A task that states a visual change runs `pnpm test:visual:update`, inspects every changed PNG, and commits them only if the diff is limited to the stated region.
- Baseline inventory (`docs/brief-inventory.json`, frozen) is never edited; moved/removed/changed seeds are declared in `tests/unit/helpers/inventory.ts` (Task 1 adds `RELOCATED_SINCE_BASELINE` and `CHANGED_SINCE_BASELINE`; later tasks add entries).
- `{placeholders}` in a `link` must be Settings › Contact names (`lib/link-rules.ts`); a whole-value href placeholder must end in `Href`.
- Before finishing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit 0. Commit after each task; do not push.

## Review Focus

1. A published row still in the old shape after deploy (migration skipped a variant) → the public read's `safeParse` fails and the section disappears. Every migration test parses the migrated rows with the current schema (Global Constraints), including builder blocks.
2. A builder page copied from Home/Services before this phase (hero, services intro/grid blocks) must render after the migration exactly like the fixed page. Tasks 7, 11, 12, 13 migration tests insert such a builder row and assert `BlockInstance` parses and the values were carried over.
3. `{quoteHref}` misuse: an admin types `{quoteHref}` or `javascript:` as the quote address itself → schema rejects it; every quote button on a page without the contact section still reaches the form (Task 11 tests).
4. A featured home service gets unpublished or deleted → the home list skips it; never a dead link or crash (Task 13 view test).
5. An invalid `settings.site.locale` (e.g. `"english"`) or timezone → dates fall back to `en` / `Europe/Dublin`, no thrown `RangeError` (Task 4 tests).

---

### Task 1: Phase 1 minors and inventory exemptions infrastructure

**Files:**
- Modify: `tests/unit/helpers/inventory.ts` (add `RELOCATED_SINCE_BASELINE`, `CHANGED_SINCE_BASELINE`, `currentTarget`)
- Modify: `tests/unit/templates/fixtures.test.ts` (drop its local `CHANGED_SINCE_BASELINE`; exemption check reads the seo root and asserts the value is defined)
- Modify: `tests/unit/templates/inventory.test.ts`, `tests/unit/schemas/settings-inventory.test.ts`, `tests/unit/seed/settings-fixtures.test.ts` (use `currentTarget`; skip `null`; settings-fixtures honours `CHANGED_SINCE_BASELINE` and fills non-template values with `contactPlaceholders(fixture.contact)` like fixtures.test's `fill`)
- Modify: `components/admin/schema-form/widgets/pickers.tsx:99-107` (Add link button `aria-describedby` = the help id when help exists)
- Modify: `server/db/migrations/0033_footer_login_link.sql` (first statement gains `AND "draft" IS NOT NULL`; branch unmerged, drizzle tracks by `when`, not hash)
- Test: `tests/dom/schema-form-nullable-link.test.tsx`

**Interfaces:**
- Produces (in `tests/unit/helpers/inventory.ts`):
  - `RELOCATED_SINCE_BASELINE: Readonly<Record<string, string | null>>` — normalised old target → new normalised target, or `null` when the field is gone. Starts `{}`.
  - `CHANGED_SINCE_BASELINE: ReadonlyMap<string, string>` — inventory entry **id** → reason. Starts with `"quoteForm.sent"` and `"serviceDetail.officeHours.hours"` (moved from fixtures.test).
  - `currentTarget(target: string): string | null` — `normalise(target)` then relocation.

- [ ] **Step 1: Failing tests.** In `fixtures.test.ts` add `it("every baseline-change exemption still has a seeded value at its (possibly relocated) path")`: for each id in `CHANGED_SINCE_BASELINE` whose entry targets `pages.*`, the value read through a shared `seededValue(path)` helper (seo paths read `fixture[key].seo`) is `!== undefined` and differs from `e.template ? e.seed : e.value`. Add `it("every relocation names a real inventory target and a live schema path")` (old path in inventory; non-null new path is a leaf/list of the template or settings schema via `schemaPaths`). In `schema-form-nullable-link.test.tsx` add: meta `{ fields: { loginLink: { help: "Shown after the legal links." } } }`, value `{ loginLink: null }` → `screen.getByRole("button", { name: /Add link/ })` `toHaveAccessibleDescription("Shown after the legal links.")`. Run `pnpm vitest run tests/unit/templates/fixtures.test.ts tests/dom/schema-form-nullable-link.test.tsx` → FAIL.
- [ ] **Step 2:** Implement the helper exports, switch the four inventory tests to `currentTarget`, the button attribute, and the 0033 guard. Re-run the two files plus `tests/unit/templates/inventory.test.ts tests/unit/schemas/settings-inventory.test.ts tests/unit/seed/settings-fixtures.test.ts` → PASS.
- [ ] **Step 3:** Commit `test: shared inventory exemptions; a11y and migration guard follow-ups`.

### Task 2: Contact cards say what they are (`kind`)

**Files:**
- Modify: `lib/schemas/settings/sections-contact.ts` (`export const CONTACT_CARD_KINDS = ["phone", "email", "address", "hours", "other"] as const`; `export type ContactCardKind`; infoCards item gains `kind: z.enum(CONTACT_CARD_KINDS)`)
- Modify: `templates/shared/views.ts` (`contactSectionView` cards; new `mapsSearchHref`)
- Modify: `components/home/contact.tsx:8-67` (remove `telHref`/`mailHref`/`mapHref` and positional destructuring; actions chosen by `kind`)
- Modify: `components/admin/settings/settings-meta.ts` (`"infoCards[].kind"`: label "Card type", widget `select`, options Phone / Email / Address / Opening hours / Other, help "Decides the phone layout's button: Call, Email or Map.")
- Modify: `server/db/seed/fixtures/settings.ts:138-162` (kinds phone, email, address, hours)
- Create: `server/db/migrations/0035_contact_info_card_kinds.sql` + journal
- Test: `tests/unit/templates/views.test.ts`, `tests/dom/contact-section.test.tsx` (new), `tests/integration/db/contact-card-kinds-migration.test.ts`

**Interfaces:**
- Produces: `mapsSearchHref(contact: { addressLine1: string; addressLine2: string }): string` → `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent(`${addressLine1}, ${addressLine2}`)` (Task 8 reuses it).
- Produces: `ContactProps["cards"][number]` = `{ kind: ContactCardKind; title: string; icon: string; lines: string[]; href: string | null }`; href: phone → `placeholders(s).officeHref`, email → `mailto:${contact.email}`, address → `mapsSearchHref(contact)`, hours/other → `null`.

- [ ] **Step 1: Failing tests.** View test: fixture sources → cards' `kind`s `["phone","email","address","hours"]`, phone `href === contactPlaceholders(settings.contact).officeHref` (no extension digits), address href `=== mapsSearchHref(settings.contact)`. DOM test renders `Contact` with cards reordered `[address, hours, email, phone]` and asserts the quick-action links (Call/Email/Directions) point at the phone/email/address hrefs, the row pills appear on those three cards only, and with two phone cards the first one wins. Run → FAIL.
- [ ] **Step 2:** Implement schema, view, component, meta, seed. Re-run → PASS. Regenerate frozen hash for `components/home/contact.tsx`.
- [ ] **Step 3: Migration test** (FAIL first): cards without `kind` titled Phone/Email/Location/Office Hours get phone/email/address/hours; untitled-by-seed cards get kind by position (0 phone, 1 email, 2 address, else other); a card that already has `kind: "other"` keeps it; published NULL untouched; re-run no-op; revisions of `sections.contact` get kinds too. Write `0035` (`jsonb_agg` over `WITH ORDINALITY`; only elements lacking `kind`). → PASS.
- [ ] **Step 4:** `pnpm test:visual` → identical. Commit `feat(contact): contact cards carry an explicit kind`.

### Task 3: Careers form shows CMS copy for server rejections

**Files:**
- Modify: `templates/careers/schema.ts` (`apply.errors.invalid: text`)
- Modify: `components/careers/types.ts:239-247` (`errors.invalid: string`)
- Create: `components/careers/application-errors.ts`
- Modify: `components/careers/cv-dropzone.tsx:9` (`export const CV_MAX_BYTES`)
- Modify: `components/careers/application-form.tsx:76-89,281-292` (`readFieldErrors` returns the field keys; the 422 branch uses `serverFieldErrors`)
- Modify: `templates/careers/view.ts` (`applyView` passes `errors.invalid`), `templates/careers/editor-meta.ts` (`"apply.errors.invalid"`: label "Answer not accepted", help "Shown when the server refuses an answer, e.g. a choice that is no longer offered.")
- Modify: `server/db/seed/fixtures/careers.ts:339` (`invalid: "Please check this answer."`)
- Create: `server/db/migrations/0036_careers_invalid_answer_copy.sql` + journal (add the key where missing, draft/published/revisions of page `careers`)
- Test: `tests/unit/careers/application-errors.test.ts` (new), `tests/dom/application-form.test.tsx`, `tests/integration/db/careers-invalid-copy-migration.test.ts`

**Interfaces:**
- Produces: `serverFieldErrors(keys: string[], errors: ApplyView["form"]["errors"], cvBytes: number): Record<string, string>` — `email` → `invalidEmail`; `cv` → `cvBytes > CV_MAX_BYTES ? cvSize : cvType`; any other key → `invalid`. Server text is never shown.

- [ ] **Step 1: Failing tests.** Unit: keys `["email","rightToWork","cv"]`, cvBytes 100 → `{ email: "<invalidEmail>", rightToWork: "<invalid>", cv: "<cvType>" }`; cvBytes 6 MB → cv is `cvSize`. DOM: a 422 body `{ error: { fieldErrors: { email: ["Enter a valid email address."], rightToWork: ["Choose an option from the list."] } } }` shows the fixture's `invalidEmail` and `invalid` copy and `queryByText("Choose an option from the list.")` is null; the existing "field the page does not show → generic" test still passes. Run → FAIL.
- [ ] **Step 2:** Implement; schema/seed/meta/view. → PASS.
- [ ] **Step 3:** Migration test (adds `"invalid":"Please check this answer."`; keeps an existing value; NULL published; re-run; revision gains key; parses with `careersTemplate`) → FAIL → write `0036` → PASS.
- [ ] **Step 4:** `pnpm exec playwright test tests/e2e/careers.spec.ts` → PASS. Commit `feat(careers): server rejections show the form's own copy`.

### Task 4: Public dates follow `settings.site.locale` and `timezone`

**Files:**
- Modify: `lib/format.ts` (remove `MONTHS`; add `DEFAULT_SITE_LOCALE`, `siteLocale`, `formatDay`; `formatPostDate` gains `locale`)
- Modify: `templates/shared/views.ts` (`articleDates` passes `siteLocale(site.locale)`)
- Modify: `templates/careers/view.ts:15-45,97,113,212` (drop the module-level `en-IE`/`en-US` formatters; `postedAgo`/`closedOnDate` take `DateOptions`; callers pass the site's)
- Modify: `components/admin/settings/settings-meta.ts:45-48` (locale help: "Language tag of the public site and its dates, e.g. en (12 Sep 2026). en-GB prints Sept.")
- Test: `tests/unit/post-dates.test.ts`, `tests/unit/careers/view.test.ts`

**Interfaces:**
- Produces in `lib/format.ts`:
  - `DEFAULT_SITE_LOCALE = "en"`
  - `siteLocale(value: string | null | undefined): string` — trimmed value if `Intl.DateTimeFormat.supportedLocalesOf(value).length > 0` (catch `RangeError`), else `"en"`.
  - `type DateOptions = { locale?: string; timeZone?: string }`
  - `formatDay(value: Date, options: DateOptions & { day?: "2-digit" | "numeric" }): string` — `"<day> <short month> <year>"` from `Intl.DateTimeFormat(siteLocale(locale), { timeZone: siteTimeZone(timeZone), day, month: "short", year: "numeric" }).formatToParts`, always in that order.
  - `formatPostDate(value: Date, timeZone?: string, locale?: string): string` = `formatDay(…, { day: "2-digit" })`.
- Produces in `templates/careers/view.ts`: `postedAgo(posted: Date, now: Date, options?: DateOptions): string` (calendar days via `isoDate(x, zone)`, `Intl.RelativeTimeFormat(siteLocale(locale))`); `closedOnDate(value: Date | string, options?: DateOptions): string` (`formatDay`, `day: "numeric"`; a `YYYY-MM-DD` string is read at 12:00Z).
- Out of scope: admin formatting (`SITE_LOCALE` en-IE, `formatDateTime`) and job openness (`lib/careers/open.ts` `irishToday`) stay Irish.

- [ ] **Step 1: Failing tests.** `formatPostDate(new Date("2026-09-12T09:00:00Z"), "Europe/Dublin", "en") === "12 Sep 2026"`; `…, "fr") === "12 sept. 2026"`; `…, "english")` and `…, "")` → `"12 Sep 2026"`; existing zone tests unchanged. Careers: `postedAgo(3 days, now, { locale: "fr" }) === "il y a 3 jours"`; default still `"3 days ago"`/`"yesterday"`; `closedOnDate("2026-11-28", { locale: "en", timeZone: "Europe/Dublin" }) === "28 Nov 2026"`; `closedOnDate(new Date("2026-09-12T23:30:00Z"), { timeZone: "America/New_York" }) === "12 Sep 2026"` (Dublin gives 13). Run `pnpm vitest run tests/unit/post-dates.test.ts tests/unit/careers/view.test.ts` → FAIL.
- [ ] **Step 2:** Implement and thread `s.settings.site` through `careersView`, `jobDetailView`, `closedRow`, `jobRow`. → PASS; `pnpm vitest run tests/unit/templates/views.test.ts` → PASS (article dates unchanged with locale `en`).
- [ ] **Step 3:** `pnpm test:visual` → identical. Commit `feat(site): public dates follow the site language and time zone`.

### Task 5: Job posting JSON-LD reads country, currency and zone from settings

**Files:**
- Modify: `lib/schemas/settings/seo-defaults.ts` (`organizationSettings.currency: z.string().regex(/^[A-Z]{3}$/, "Three capital letters, e.g. EUR")`)
- Modify: `components/admin/seo/growth-meta.ts:68-71` (`"organization.currency"`: label "Currency code", help "ISO 4217, e.g. EUR. Used for job pay in Google for Jobs.")
- Modify: `server/db/seed/fixtures/settings.ts:226` (`currency: "EUR"`)
- Modify: `lib/seo/job-posting.ts` (org param; `irishOffset` → `zoneOffset(day, timeZone)`)
- Modify: `app/(site)/careers/[slug]/page.tsx:57-61` (pass `seo.defaults.organization.addressCountry`, `.currency`, `siteTimeZone(site.timezone)`)
- Create: `server/db/migrations/0037_seo_organization_currency.sql` + journal (`organization` gains `"currency":"EUR"` where missing; draft/published/revisions of `seo.defaults`)
- Test: `tests/unit/seo/job-posting.test.ts`, `tests/integration/db/organization-currency-migration.test.ts`

**Interfaces:**
- Produces: `jobPostingJsonLd(job: JobInput, origin: string, org: { name: string; url: string; addressCountry: string; currency: string; timeZone: string }): WithContext<JobPosting>`.
- Limitation kept: `parseHourlyOrYearlyPay` still reads only `€` amounts (out of scope).

- [ ] **Step 1: Failing tests.** With org `{ …, addressCountry: "GB", currency: "GBP", timeZone: "Europe/London" }` and closingDate `2026-07-15`: `jobLocation.address.addressCountry === "GB"`, `baseSalary.currency === "GBP"`, `validThrough === "2026-07-15T23:59:59+01:00"`; with `timeZone: "America/New_York"` → `"…-04:00"`; existing Dublin cases pass with `{ addressCountry: "IE", currency: "EUR", timeZone: "Europe/Dublin" }`. → FAIL.
- [ ] **Step 2:** Implement, plus schema/meta/seed. → PASS.
- [ ] **Step 3:** Migration test (adds EUR; keeps `"GBP"`; NULL published; re-run; parses with `seoDefaultsSettings`) → FAIL → write `0037` → PASS.
- [ ] **Step 4:** Commit `feat(seo): job postings take country, currency and zone from settings`.

### Task 6: One `pageHero` shape with an optional banner

**Files:**
- Modify: `lib/schemas/common.ts:176-186,226-227` (`pageHero.image: mediaRef.nullable()`; delete `pageHeroText` and `PageHeroText`)
- Modify: `templates/about/schema.ts`, `templates/contact/schema.ts`, `templates/careers/schema.ts` (use `pageHero`)
- Modify: `blocks/registry.ts:35-45` (`hero.page` schema = `pageHero`; drop the `pageHeroText` import)
- Modify: `templates/shared/views.ts:168-187` (`pageHeroView` input type; `image: (hero.image ?? site.defaultHeroImage).url`)
- Modify: `templates/builder/views.ts:82-88` (`pageHeroView(s, block.data)`), `templates/builder/from-template.ts` (about/contact/careers pass `d.hero` as is)
- Modify: editor meta `templates/{about,contact,careers,blog,services}/editor-meta.ts` (`"hero.image"`: label "Banner image", help "Leave empty to use the default banner (Settings › Site)."; about/contact/careers hero groups = `PAGE_HERO_GROUPS` from `templates/shared/editor-groups.ts`; about/contact hero help no longer says the page cannot pick its own)
- Modify: `server/db/seed/fixtures/pages.ts`, `server/db/seed/fixtures/careers.ts` (about/contact/careers `hero.image: null`)
- Create: `server/db/migrations/0038_page_hero_image.sql` + journal (`hero.image = null` where the hero has no `image` key: pages `about`, `contact`, `careers`; draft/published/revisions)
- Test: `tests/unit/templates/views.test.ts`, `tests/unit/blocks/registry.test.ts`, `tests/unit/builder/from-template.test.ts`, `tests/unit/templates/fixtures.test.ts`, `tests/unit/templates/inventory.test.ts`, `tests/integration/db/page-hero-image-migration.test.ts`

**Interfaces:**
- Produces: `pageHero` (`{ image: MediaRef | null; crumb; title; description }`), `type PageHero`.
- Produces: `pageHeroView(s: NotFoundSources, hero: Omit<WithMedia<PageHero>, "image"> & { image?: WithMedia<PageHero>["image"] }, parents?): PageHeroProps` (the 404 copy has no image key).

- [ ] **Step 1: Failing tests.** Views: blog hero with `image: null` → `pageHeroView(...).image === settings.site.defaultHeroImage.url`; about hero with an image → that image. Registry: `BLOCK_BY_TYPE["hero.page"].schema === pageHero`. Fixtures: replace "about and contact heroes have no own image" with `fixture.about.data.hero.image` and `fixture.contact.data.hero.image` `toBeNull()`. Inventory: `POST_BASELINE_PAGE_LEAVES` gains `"about:hero.image"`, `"contact:hero.image"`. → FAIL.
- [ ] **Step 2:** Implement schema, views, builder, meta, seeds. `pnpm typecheck` → 0 errors; tests → PASS.
- [ ] **Step 3:** Migration test (adds `image: null`; an existing image on services/blog untouched; NULL published; re-run; revisions; parses with each template) → FAIL → write `0038` → PASS.
- [ ] **Step 4:** `pnpm test:visual` → identical (incl. builder specs). Commit `refactor(pages): one page hero shape, banner optional everywhere`.

### Task 7: ICCA membership lives in Settings › Site

**Files:**
- Modify: `lib/schemas/settings/site.ts` (`membership: z.object({ logo: mediaRef, logoAlt: text, name: text })`)
- Modify: `templates/home/schema.ts` (remove `hero.memberLogo`, `hero.memberLogoAlt`; keep `memberLabel`), `lib/schemas/settings/sections-contact.ts` (remove `memberLogo`, `memberLogoAlt`, `memberSubtitle`; keep `memberTitle`)
- Modify: `templates/shared/views.ts` (`heroView` member from `site.membership`; `contactSectionView` member `{ logo, logoAlt, title: section.memberTitle, subtitle: membership.name }`)
- Modify: `blocks/registry.ts:24-31` (hero defaults drop `memberLogoAlt`)
- Modify: `templates/home/editor-meta.ts` (Membership group = `memberLabel` only, description "Logo and name are in Settings › Site › Membership."), `components/admin/settings/settings-meta.ts` (site: `membership` group "Membership" with `membership.logo` (square), `membership.logoAlt`, `membership.name` help "Shown under the logo in the contact section."; sections.contact: drop the three fields)
- Modify: seeds `server/db/seed/fixtures/settings.ts` (site `membership: { logo: media("/images/home/icca.png"), logoAlt: "Irish Contract Cleaning Association", name: "Irish Contract Cleaning Association" }`; remove contact keys) and `server/db/seed/fixtures/pages.ts:31-33`
- Modify: `tests/unit/helpers/inventory.ts` (relocate `pages.home.hero.memberLogo` → `settings.site.membership.logo`, `…memberLogoAlt` → `…membership.logoAlt`, `settings.sections.contact.memberLogo` → `…membership.logo`, `…memberLogoAlt` → `…membership.logoAlt`, `…memberSubtitle` → `…membership.name`; CHANGED ids `contact.member.logo`, `contact.member.logoAlt`)
- Create: `server/db/migrations/0039_site_membership.sql` + journal
- Test: `tests/unit/hero-view.test.ts`, `tests/unit/templates/views.test.ts`, `tests/integration/db/site-membership-migration.test.ts`

**Interfaces:**
- Produces: `settings.site.membership` (`SiteSettings["membership"]`). `HeroProps` / `ContactProps` unchanged (no component edit).
- Design check done: `public/images/home/icca.png` (134×70) and `icca-member.png` (127×67) are the same artwork on transparent background, so one image serves both places.

- [ ] **Step 1: Failing tests.** Hero view: `member.logo === site.membership.logo.url`, `logoAlt === membership.logoAlt`, `label === hero.memberLabel`. Contact view: `member.subtitle === membership.name`, `member.logo === membership.logo.url`. → FAIL.
- [ ] **Step 2:** Implement schemas, views, meta, seeds, inventory entries. → PASS (`pnpm vitest run tests/unit`).
- [ ] **Step 3: Migration test** (FAIL first). `0039` per column (draft / published separately): site gains `membership` where missing = `{ logo: home.hero.memberLogo ?? contact.memberLogo, logoAlt: home.hero.memberLogoAlt ?? contact.memberLogoAlt, name: contact.memberSubtitle ?? home.hero.memberLogoAlt }`; then remove the old keys from `pages.home` hero, `sections.contact` and every builder `hero` block (`#- '{…}'`, version+1 when changed); `media_usages`: insert `('settings','site','membership.logo')`, delete `('page','home','hero.memberLogo')`, `('settings','sections.contact','memberLogo')`, `('builder-page', *, field ~ '^blocks\.[0-9]+\.data\.memberLogo$')`; site revisions gain the same `membership`. Assertions: values carried over from an admin-edited hero alt; a site row that already has `membership` keeps it; NULL published; re-run; builder hero block parses with `BlockInstance` and has no `memberLogo`; usage rows moved. → PASS.
- [ ] **Step 4:** Visual change (stated): the contact section's logo becomes `icca.png` and its alt text the full name. `pnpm test:visual:update`; diffs only inside the membership card on pages with the contact section (`/`, `/about`, `/services`, `/services/*`, `/blog`, `/blog/*`, `/contact`, builder pages). Commit `feat(site): one membership logo and name for hero and contact`.

### Task 8: Footer address reads Settings › Contact

**Files:**
- Modify: `lib/schemas/settings/footer.ts` (remove `addressLine2`; doc comment: lines are `contact.addressLine1`, `contact.addressLine2`, `contactOfficeLine`, `contact.email`)
- Modify: `templates/shared/views.ts:95-97,123-136` (lines use `contact.addressLine2`; `mapsHref = mapsSearchHref(contact)` from Task 2)
- Modify: `components/admin/settings/settings-meta.ts:191-217` (drop the field; Contact column group = `contactOfficeLine`, description "The address and email come from Contact details.")
- Modify: `server/db/seed/fixtures/settings.ts:72`, `tests/unit/helpers/inventory.ts` (relocate `settings.footer.addressLine2` → `settings.contact.addressLine2`; CHANGED id `footer.contactLines.address2`; update the `DERIVED_SETTINGS_PATHS` comment), `tests/unit/templates/inventory.test.ts` DERIVED comment
- Create: `server/db/migrations/0040_footer_address_from_contact.sql` + journal (`"draft" - 'addressLine2'`, same for published, footer row only)
- Test: `tests/unit/templates/views.test.ts`, `tests/integration/db/footer-address-migration.test.ts`

- [ ] **Step 1: Failing test.** `chromeView(s).footer.contact.lines[1] === settings.contact.addressLine2` and `hrefs[0] === hrefs[1] === mapsSearchHref(settings.contact)`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3:** Migration test (key removed in draft/published; other keys kept; NULL published; re-run; parses with `footerSettings`) → FAIL → `0040` → PASS.
- [ ] **Step 4:** Visual change (stated): the footer's second address line now reads "Co. Laois, Ireland. R32 YX49" on every page. `pnpm test:visual:update`; diffs only in the footer contact column. Commit `feat(footer): address comes from contact details`.

### Task 9: `StepsSection` replaces HowItWorks and HiringProcess

**Files:**
- Modify: `lib/schemas/common.ts` (add `step`, `stepsSection`, types `Step`, `StepsSectionData`)
- Modify: `lib/schemas/settings/sections-how-it-works.ts` (`howItWorksSettings = stepsSection`), `templates/careers/schema.ts` (`process: stepsSection`; local `step` → shared import), `templates/contact/schema.ts:19` (`steps: z.array(step).min(1)`; the quote form's own step list UI is unchanged)
- Create: `components/home/steps-section.tsx`
- Delete: `components/services/how-it-works.tsx`, `components/careers/hiring-process.tsx`; remove `HiringProcessProps` from `components/careers/types.ts` (`CareersView.process: StepsSectionProps`)
- Modify: `templates/shared/views.ts` (`howItWorksView` via `stepsSectionView`), `templates/careers/view.ts:172-180`, `templates/services/view.ts`, `templates/services/render.tsx:7,42`, `templates/careers/render.tsx:1,33`, `templates/builder/views.ts:14,54`, `templates/builder/render.tsx:15,49`
- Modify: `components/admin/settings/settings-meta.ts` (`sections.howItWorks` `intro`: label "Introduction", help "Optional. Shown under the heading.") and `templates/careers/editor-meta.ts` (`"process.intro"` same help)
- Modify: `server/db/seed/fixtures/settings.ts` (`"sections.howItWorks".intro: null`)
- Create: `server/db/migrations/0041_steps_section_intro.sql` + journal (`intro: null` where missing; draft/published/revisions of `sections.howItWorks`)
- Test: `tests/dom/steps-section.test.tsx` (new), `tests/unit/templates/views.test.ts`, `tests/unit/careers/view.test.ts`, `tests/integration/db/steps-intro-migration.test.ts`

**Interfaces:**
- Produces: `step = z.object({ title: text, description: text })`; `stepsSection = z.object({ eyebrow: text, title: text, intro: text.nullable(), steps: z.array(step).min(1).max(8) })`.
- Produces: `StepsSectionProps = { eyebrow: string; title: string; intro?: string; steps: { title: string; description: string }[]; variant: "compact" | "wide" }`, `StepsSection(props)`. `compact` = the old HowItWorks markup verbatim (md breakpoints, 3 columns, round badge; an intro, when given, renders under the h2 with SectionHeading's description classes). `wide` = the old HiringProcess markup verbatim (SectionHeading with intro, `sm:grid-cols-2 lg:grid-cols-4`, `data-card="light"`, square badge). Badges are `String(i + 1).padStart(2, "0")` in both.
- Produces: `stepsSectionView(section: StepsSectionData, variant: StepsSectionProps["variant"]): StepsSectionProps` (null intro → no `intro` key).

- [ ] **Step 1: Failing tests.** DOM: `compact` with 3 steps → badges "01","02","03", no intro paragraph; `wide` with intro → intro text visible, each `li` has `data-card="light"`. Views: `howItWorksView(s)` deep-equals `{ eyebrow, title, steps, variant: "compact" }`; careers `process.variant === "wide"`, steps carry no `number`. → FAIL.
- [ ] **Step 2:** Implement, delete the two old components, rewire views/renders/builder, schemas, meta, seed. Frozen hashes: drop `components/services/how-it-works.tsx`, add `components/home/steps-section.tsx`. → PASS.
- [ ] **Step 3:** Migration test (adds `intro: null`; keeps a set intro; NULL published; re-run; parses with `howItWorksSettings`) → FAIL → `0041` → PASS.
- [ ] **Step 4:** `pnpm test:visual` → identical (`/services/*`, `/careers`, builder). Commit `refactor(sections): one StepsSection for services and careers`.

### Task 10: `IconCardsSection` replaces WhyChooseUs and WhyJoin

**Files:**
- Modify: `lib/schemas/common.ts` (add `iconCardsSection`, type `IconCardsSectionData`)
- Modify: `lib/schemas/settings/sections-why-choose-us.ts` (`whyChooseUsSettings = iconCardsSection.extend({ background: mediaRef })`; `features` renamed `cards`), `templates/careers/schema.ts` (`why: iconCardsSection`)
- Create: `components/home/icon-cards-section.tsx`
- Delete: `components/home/why-choose-us.tsx`, `components/careers/why-join.tsx`; remove `WhyJoinProps` from `components/careers/types.ts` (`CareersView.why: IconCardsSectionProps`)
- Modify: `templates/shared/views.ts:235-247`, `templates/careers/view.ts:135-144`, `templates/{home,about,services}/view.ts` + `render.tsx`, `templates/careers/render.tsx:18,30`, `templates/builder/views.ts:13,49`, `templates/builder/render.tsx:13,39`
- Modify: `components/admin/settings/settings-meta.ts:311-345` (`features` → `cards`, item name "Card"), `lib/admin/settings-keys.ts:92` (description says "cards")
- Modify: `server/db/seed/fixtures/settings.ts` (`features` → `cards`), `tests/unit/helpers/inventory.ts` (relocate `settings.sections.whyChooseUs.features`, `features[].title`, `features[].description`, `features[].icon` → `cards…`)
- Create: `server/db/migrations/0042_icon_cards_section.sql` + journal (rename key where `features` exists and `cards` does not, draft/published/revisions; `UPDATE media_usages SET field = regexp_replace(field, '^features\.', 'cards.') WHERE entity_type = 'settings' AND entity_id = 'sections.whyChooseUs'`)
- Test: `tests/dom/icon-cards-section.test.tsx` (new), `tests/unit/templates/views.test.ts`, `tests/integration/db/icon-cards-migration.test.ts`

**Interfaces:**
- Produces: `iconCardsSection = z.object({ eyebrow: text, title: text, description: text, cards: z.array(iconCard).min(1).max(8) })`.
- Produces: `IconCardsSectionProps = { eyebrow: string; title: string; description: string; cards: { title: string; description: string; icon: string }[]; background?: string }`, `IconCardsSection(props)`: with `background` = the old WhyChooseUs markup verbatim (photo + gradient, inverted heading, `data-story-*`, `data-features`, `data-feature-icon` kept for `components/motion/home-motion.tsx`); without = the old WhyJoin markup verbatim.
- Produces: `iconCardsView(section: WithMedia<IconCardsSectionData> & { background?: MediaView }): IconCardsSectionProps` in `templates/shared/views.ts`; `whyChooseUsView` and the careers `why` use it.

- [ ] **Step 1: Failing tests.** DOM: with `background` → `section` has `data-story-track`, list has `data-features`, heading text is white (class `text-white`); without → `ul[data-stagger]`, cards `data-card="light"`. Views: `whyChooseUsView(s).cards` length 4 with first title "Skilled Cleaners" and `background` set; careers `why` has no `background`. → FAIL.
- [ ] **Step 2:** Implement, delete old components, rewire, meta, seed, inventory. Frozen: drop `components/home/why-choose-us.tsx`, add `components/home/icon-cards-section.tsx`. → PASS.
- [ ] **Step 3:** Migration test (rename keeps values and order; a row already on `cards` untouched; usage rows renamed; NULL published; re-run; parses with `whyChooseUsSettings`) → FAIL → `0042` → PASS.
- [ ] **Step 4:** `pnpm test:visual` → identical (`/`, `/about`, `/services`, `/services/*`, `/careers`, builder). Commit `refactor(sections): one IconCardsSection for why-choose-us and careers`.

### Task 11: One quote button: `{quoteLabel}` and `{quoteHref}`

Decision: the shared source is two Settings › Contact values used as placeholders, not a new settings key. Every quote button is an ordinary `link` whose default is `{ label: "{quoteLabel}", href: "{quoteHref}" }`; a place that needs other words types its own label but keeps `{quoteHref}`. This reuses the validated placeholder pipeline (editor hints, `unknownPlaceholder`, `interpolateHref` safety re-check) with no new row, public key or cache tag, and `{quoteHref}` defaults to `/contact#quote`, which works on every page (today's `#contact` is dead on careers, legal and most builder pages).

**Files:**
- Modify: `lib/schemas/settings/contact.ts` (`quoteLabel: text`; `quoteHref: href.refine((v) => !v.includes("{"), "Use a real address such as /contact#quote")`)
- Modify: `lib/link-rules.ts` (`CONTACT_FIELDS` gains `"quoteLabel"`, `"quoteHref"`; `URL_PLACEHOLDERS` then includes `quoteHref` automatically)
- Modify: `components/admin/settings/settings-meta.ts` contact (group "Quote button": `quoteLabel` label "Quote button text", help "Used by every button whose text is {quoteLabel}."; `quoteHref` label "Quote page address", help "Where every {quoteHref} button goes, e.g. /contact#quote.")
- Modify seeds: `settings.ts` (contact `quoteLabel: "Get a Free Quote"`, `quoteHref: "/contact#quote"`; navigation.cta `{ label: "Get a Quote", href: "{quoteHref}" }` — the header keeps its shorter wording; microcopy.quoteCard.cta `{ "{quoteLabel}", "{quoteHref}" }`; quoteBox.cta `{ "Fill the Form", "{quoteHref}" }`), `pages.ts` (home hero.primaryCta, about story.cta, services grid.quoteCta → `{ "{quoteLabel}", "{quoteHref}" }`; helpCard.cta `{ "Contact Us", "{quoteHref}" }`)
- Modify: `tests/unit/helpers/inventory.ts` CHANGED ids `navigation.cta.href`, `home.hero.primaryCta.href`, `about.story.cta.href`, `services.grid.quote.href`, `services.grid.quote.label`, `services.grid.help.cta.href`, `quoteCard.cta.href`, `contact.quoteBox.cta.href`
- Create: `server/db/migrations/0043_quote_cta_placeholders.sql` + journal
- Test: `tests/unit/link-rules.test.ts`, `tests/unit/interpolate.test.ts`, `tests/unit/templates/views.test.ts`, `tests/integration/db/quote-cta-migration.test.ts`

**Interfaces:**
- Produces: placeholders `{quoteLabel}` (text) and `{quoteHref}` (URL; usable as a whole href).

- [ ] **Step 1: Failing tests.** link-rules: placeholder list equality gains both; `linkPlaceholderProblems({ label: "{quoteLabel}", href: "{quoteHref}" })` is `{}`; `contactSettings.safeParse({ …, quoteHref: "{quoteHref}" })` and `…"javascript:alert(1)"` fail. Views: `chromeView(s).header.cta` `{ label: "Get a Quote", href: "/contact#quote" }`; `heroView(...).primaryCta` `{ "Get a Free Quote", "/contact#quote" }`; `quoteCardView(s).cta.href === "/contact#quote"`. → FAIL.
- [ ] **Step 2:** Implement schema, link rules, meta, seeds, inventory. → PASS (`pnpm vitest run tests/unit`).
- [ ] **Step 3: Migration test** (FAIL first). `0043`: contact gains `quoteLabel` "Get a Free Quote" / `quoteHref` "/contact#quote" where missing (and in contact revisions); `pg_temp.quote_link(jsonb)` maps exactly these seeded links: `{"Get a Free Quote","#contact"}` and `{"Get A Quote","#contact"}` → `{"{quoteLabel}","{quoteHref}"}`; `{"Get a Quote","#contact"}` → `{"Get a Quote","{quoteHref}"}`; `{"Fill the Form","/contact#quote"}` → `{"Fill the Form","{quoteHref}"}`; `{"Contact Us","#contact"}` → `{"Contact Us","{quoteHref}"}`; anything else returned unchanged. Applied to `settings` navigation `{cta}`, microcopy `{quoteCard,cta}`, sections.contact `{quoteBox,cta}`; `pages` home `{hero,primaryCta}`, about `{story,cta}`, services `{grid,quoteCta}`, `{grid,helpCard,cta}`; builder blocks `hero.data.primaryCta`, `ourStory.data.cta`, `services.data.grid.quoteCta`, `services.data.grid.helpCard.cta` (version+1). Assertions: seeded links rewritten; `{"Book now","/book"}` kept; builder copy of the services page parses with `BlockInstance` and has the placeholders; NULL published; re-run. → PASS.
- [ ] **Step 4:** Visual change (stated): `/services` grid button reads "Get a Free Quote" (was "Get A Quote"). `pnpm test:visual:update`; only that button differs. `pnpm exec playwright test tests/e2e/public-site.spec.ts tests/e2e/services-collections.spec.ts tests/e2e/seo.spec.ts tests/e2e/settings-editor.spec.ts` → PASS (update any `#contact` href expectation to `/contact#quote`). Commit `feat(site): one quote button text and address for every page`.

### Task 12: One quote card with per-place overrides

**Files:**
- Modify: `lib/schemas/common.ts` (add `quoteCard`, `quoteCardOverrides`, types)
- Modify: `lib/schemas/settings/microcopy.ts` (`quoteCard` = shared `quoteCard`; `telLabel` → `phoneLabel`), `lib/schemas/settings/sections-contact.ts` (`quoteBox: quoteCardOverrides.omit({ phoneLabel: true })`), `templates/services/schema.ts:18-24` (`helpCard: quoteCardOverrides.extend({ icon: mediaRef })`)
- Modify: `templates/shared/views.ts` (`quoteCardView(s, overrides?)`; `contactSectionView.quote` and `servicesGridView.helpCard` built from it)
- Modify: `components/admin/settings/settings-meta.ts` (microcopy `"quoteCard.phoneLabel"` replaces `telLabel`, group description "The shared quote card: service and article sidebars, the contact section and the services help card."; sections.contact `quoteBox.*` help "Leave empty to use the shared quote card (Settings › Microcopy)."), `templates/services/editor-meta.ts` (same help on `grid.helpCard.*`; `phoneLabel` replaces `callLabel`)
- Modify seeds: microcopy `phoneLabel: "Tel: {office} Ext {officeExtension}"`; quoteBox `{ title: null, body: null, cta: { label: "Fill the Form", href: "{quoteHref}" } }`; helpCard `{ icon, title: "Not sure what you need?", body: null, phoneLabel: "Or call {office} Ext {officeExtension}", cta: { label: "Contact Us", href: "{quoteHref}" } }`
- Modify: `tests/unit/helpers/inventory.ts` (relocate `settings.microcopy.quoteCard.telLabel` → `…phoneLabel`, `pages.services.grid.helpCard.callLabel` → `…helpCard.phoneLabel`; CHANGED ids `contact.quoteBox.title`, `contact.quoteBox.body`, `services.grid.help.body`)
- Create: `server/db/migrations/0044_shared_quote_card.sql` + journal
- Test: `tests/unit/templates/views.test.ts`, `tests/integration/db/quote-card-migration.test.ts`

**Interfaces:**
- Produces: `quoteCard = z.object({ title: text, body: text, phoneLabel: text, cta: link })`; `quoteCardOverrides = z.object({ title: text.nullable(), body: text.nullable(), phoneLabel: text.nullable(), cta: link.nullable() })`.
- Produces: `quoteCardView(s: SiteSources, overrides?: Partial<WithMedia<QuoteCardOverrides>>): QuoteCardProps` — each field `override ?? shared`; `tel = { label: interpolate(phoneLabel), href: officeHref }`. Component props (`QuoteCardProps`, `ContactProps.quote`, `ServicesGridProps.helpCard`) unchanged.

- [ ] **Step 1: Failing tests.** `contactSectionView(s).quote` equals `{ title: microcopy.quoteCard.title, body: microcopy.quoteCard.body, cta: { label: "Fill the Form", href: "/contact#quote" } }`; `servicesGridView(...).helpCard` title "Not sure what you need?", body = shared body, `call.label` "Or call 057 8697670 Ext 4"; with every override null the help card equals the shared card. → FAIL.
- [ ] **Step 2:** Implement schemas, view, meta, seeds, inventory. → PASS.
- [ ] **Step 3: Migration test** (FAIL first). `0044` per column: microcopy `quoteCard` renames `telLabel` → `phoneLabel` (also in microcopy revisions); sections.contact `quoteBox.title`/`body` become null where equal to that column's microcopy title/body (edited text stays as an override; `cta` kept); services `grid.helpCard`: `callLabel` → `phoneLabel`, title/body null where equal to microcopy's (also services revisions: rename only); same helpCard transform on builder `services` grid blocks via `pg_temp.help_card(jsonb, jsonb)`. Assertions: seeded rows → nulls; an edited quoteBox body kept; builder grid block parses; NULL published; re-run. → PASS.
- [ ] **Step 4:** `pnpm test:visual` → identical. Commit `feat(site): one quote card, overridable per place`.

### Task 13: Home services list picks from the services collection

Supersedes the uncommitted title-matching change in the main checkout (`components/home/services.tsx`, `templates/shared/views.ts`): do not port it.

**Files:**
- Modify: `templates/home/schema.ts:34` (`items: z.array(z.object({ service: slug, description: text })).min(1).max(6)`)
- Modify: `templates/shared/views.ts:503-519` (`servicesIntroView` resolves items from `s.services`)
- Modify: `components/home/services.tsx:16,78-103` (item gets `href`; the row is a `Link` carrying the old `li` classes, `li` keeps `key` and `data-service-item`)
- Modify: `templates/home/editor-meta.ts` (`"services.items"`: label "Services", itemName "Service", itemLabel "service", help "Pick services; the name and link come from the service page."; `"services.items[].service"`: label "Service", widget `collection`, collection `services`; `"services.items[].description"`: label "Short description")
- Modify: `server/db/seed/fixtures/pages.ts:44-60` (`[{ service: "medical-cleaning", description: <seeded medical text> }, { service: "commercial-cleaning", description: <seeded commercial text> }, { service: "retail-cleaning", description: "Shops, showrooms and salons kept customer-ready, on your schedule." }]` — there is no Domestic service)
- Modify: `tests/unit/templates/fixtures.test.ts` ("home service items" asserts every `service` is a slug in the services fixture; length 3 stays), `tests/unit/templates/inventory.test.ts` (`POST_BASELINE_PAGE_LEAVES` + `"home:services.items[].service"`), `tests/unit/helpers/inventory.ts` (relocate `pages.home.services.items[].title` → `null`)
- Create: `server/db/migrations/0045_home_featured_services.sql` + journal
- Test: `tests/unit/templates/views.test.ts`, `tests/dom/schema-form-lists.test.tsx`, `tests/integration/db/home-services-migration.test.ts`

**Interfaces:**
- Produces: `ServicesProps["items"][number] = { title: string; description: string; href: string }`; `servicesIntroView` drops items whose slug is not a published service.

- [ ] **Step 1: Failing tests.** Views: fixture → items titles `["Medical Cleaning","Commercial Cleaning","Retail Cleaning"]`, hrefs `/services/<slug>`; an item with `service: "gone"` is skipped; all unknown → `items: []`. DOM (schema-form-lists): a list of `{ service, description }` with meta `widget: "collection"` on `items[].service` renders a service picker per item. → FAIL.
- [ ] **Step 2:** Implement schema, view, component, meta, seed, test exemptions. Frozen hash for `components/home/services.tsx`. → PASS.
- [ ] **Step 3: Migration test** (FAIL first). `0045` with `pg_temp.home_items(items jsonb) RETURNS jsonb`: the exact seeded 3-item array → the new seeded array; otherwise each item whose `title` matches (case-insensitive, trimmed) a service's `COALESCE("published","draft") ->> 'title'` becomes `{ service: slug, description }`, unmatched items are dropped, an empty result becomes the new seeded array. Applied to `pages.home` `{services,items}` (draft/published/revisions) and builder `services` blocks with `data.intro` (version+1). Assertions: seeded → new array; admin list `[{title:"ULV Fogging",description:"x"}]` → `[{service:"ulv-fogging",description:"x"}]`; builder intro block parses; NULL published; re-run. → PASS.
- [ ] **Step 4:** Visual change (stated): the third home row reads "Retail Cleaning" and rows are links. `pnpm test:visual:update`; only the home services list differs. `pnpm exec playwright test tests/e2e/public-site.spec.ts tests/e2e/page-editor.spec.ts` → PASS. Commit `feat(home): services list picks from the services collection`.

### Final check

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0; `pnpm test:visual` and `pnpm exec playwright test tests/e2e/public-site.spec.ts tests/e2e/careers.spec.ts tests/e2e/builder-public.spec.ts tests/e2e/settings-editor.spec.ts` → PASS.
- [ ] Whole-branch review (opus).

**Out of scope, by decision:**
- `app/(site)/error.tsx` and `app/global-error.tsx` stay static (they render when settings cannot be read).
- Careers sections as page-builder blocks: needs new non-shared block data, block-library copy, anchors and new builder baselines; becomes a small follow-up now that `StepsSection`/`IconCardsSection` take plain props.
- Lucide icons in public components (chevrons, phone glyph, upload, close) are interface affordances tied to the control, not content; content icons already come from the media library (cards, features) or a CMS enum (`components/careers/offer-icon.tsx`).
- The contact quote form's step list keeps its own markup; only its schema shares `step`.
- Admin date/time formatting (`SITE_LOCALE`, `formatDateTime`), job openness rules (`lib/careers/open.ts`) and `€`-only pay parsing in `lib/seo/job-posting.ts`.
