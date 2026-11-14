# Dynamic Content — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the highest-impact static content found by the 2026-11-13 audit: careers contact details, services office hours, the footer "Login" link and the unbranded 404 page all become admin-managed.

**Architecture:** Content lives in Zod-validated JSON rows (`settings`, `pages` tables, `draft` + `published` columns). Schema change → admin editor meta (`components/admin/settings/settings-meta.ts`) → seed fixture → hand-written data migration (`server/db/migrations/00NN_*.sql`, registered in `meta/_journal.json`) that backfills existing rows on both `draft` and `published` → view mapper in `templates/**` → component. Contact values are reused through `{placeholders}` (`lib/link-rules.ts`, `lib/interpolate.ts`).

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching routing files), Zod 4, Drizzle 0.45 + Postgres, Vitest (unit / dom / integration projects), Tailwind 4.

**Spec:** the audit report in this session (no separate spec file). Phase 2 (shared quote CTA, single `pageHero`, `StepsSection`/`IconCardsSection`, membership logo, home services from collection, footer address dedupe, careers server error copy, careers date locale, contact cards by type) gets its own plan after Phase 1 ships.

## Global Constraints

- Every data migration updates `draft` and `published` (published only `WHERE "published" IS NOT NULL`), is re-runnable, and never overwrites a value the admin has changed from the seeded one.
- Migration files follow `00NN_snake_name.sql`, statements separated by `--> statement-breakpoint`, plus a `_journal.json` entry (`idx`, `version: "7"`, `when`, `tag`, `breakpoints: true`). Next free number: `0031`.
- Seed fixtures (`server/db/seed/fixtures/*`) must parse with the updated schemas.
- Editing a public component requires regenerating `tests/unit/blocks/frozen-components.json` (see the test that reads it for the command).
- Before finishing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit 0.
- Commit after each task; do not push.

## Review Focus

1. Admin already edited the careers phone/email to something else → migration must leave it untouched (Task 1 integration test).
2. `published` is NULL on a never-published row → migration must not crash or create `published` (Tasks 1–3 integration tests).
3. Admin clears the footer login link → footer renders legal pages only, no empty `<a>` (Task 3 view test).
4. `settings.contact.hours` contains characters like `–` → `{hours}` interpolation outputs it verbatim (Task 2 view test).
5. A `notFound()` from `/blog/[slug]` and `/careers/[slug]` renders the branded 404 with header/footer and HTTP 404 (Task 4 e2e/dom check).

---

### Task 1: Careers phone & email come from Settings › Contact

**Files:**
- Modify: `lib/schemas/settings/contact.ts` (add `recruitmentEmail: z.email()`)
- Modify: `lib/link-rules.ts` (`CONTACT_FIELDS` gains `"recruitmentEmail"`)
- Modify: `components/admin/settings/settings-meta.ts` (contact: label "Recruitment email", help "Shown on the careers pages.")
- Modify: `server/db/seed/fixtures/settings.ts` (`recruitmentEmail: "jobs@cleaningpartners.ie"`)
- Modify: `server/db/seed/fixtures/careers.ts:11-14` (`tel = { label: "{mobile}", href: "{mobileHref}" }`, `mail = { label: "{recruitmentEmail}", href: "mailto:{recruitmentEmail}" }`, talentPool.call label `"Call {mobile}"`)
- Create: `server/db/migrations/0031_careers_contact_placeholders.sql` + journal entry
- Test: `tests/unit/link-rules.test.ts`, `tests/integration/db/careers-contact-migration.test.ts`

**Interfaces:**
- Produces: placeholder `{recruitmentEmail}` usable in any `link` label/href.

- [ ] **Step 1:** Update `tests/unit/link-rules.test.ts` so the contact-fields/schema equality includes `recruitmentEmail`; add `expect(unknownPlaceholder("mailto:{recruitmentEmail}")).toBeUndefined()`. Run `pnpm vitest run tests/unit/link-rules.test.ts` → FAIL.
- [ ] **Step 2:** Schema, `CONTACT_FIELDS`, editor meta, settings seed. Re-run → PASS.
- [ ] **Step 3:** Write `tests/integration/db/careers-contact-migration.test.ts` (pattern: `tests/integration/db/seo-defaults-robots-migration.test.ts`):
  - `contact` row without `recruitmentEmail` → after migrate, `draft.recruitmentEmail` and `published.recruitmentEmail` equal the careers row's old `job.email.label` (`"jobs@cleaningpartners.ie"`); falls back to `contact.email` when no careers row.
  - careers page row with seeded `tel`/`mail` at `talentPool.call`, `job.phone`, `job.email`, `apply.sidebar.phone`, `apply.sidebar.email` → replaced with the placeholder links above.
  - careers row whose `job.phone.href` is `"tel:+353000"` (admin-edited) → unchanged.
  - row with `published` NULL → stays NULL.
  - running the migration twice → same result.
  Run → FAIL (file missing).
- [ ] **Step 4:** Write the migration (seeded match: href `tel:+353858062369`, email label `jobs@cleaningpartners.ie`; locate the careers row via the key the seed uses in `server/db/seed/fixtures/careers.ts`). Re-run → PASS.
- [ ] **Step 5:** Update careers seed fixture; `pnpm vitest run tests/unit tests/dom` → PASS (fix any snapshot of careers copy by asserting interpolated output, not the template).
- [ ] **Step 6:** Commit `feat(careers): read phone and recruitment email from contact settings`.

### Task 2: Services office hours use `{hours}`

**Files:**
- Modify: `templates/services/view.ts:108-110` (`hours: interpolate(detail.officeHours.hours, values)`)
- Modify: `server/db/seed/fixtures/pages.ts:154` (`hours: "{hours}"`)
- Modify: the services page editor meta (find the meta file for `servicesTemplate`; help = `PLACEHOLDER_HELP`-style text "{hours} is filled from Contact details.")
- Create: `server/db/migrations/0032_services_office_hours_placeholder.sql` + journal entry
- Test: existing services view test (grep `serviceDetailView` under `tests/`; create `tests/unit/services-view.test.ts` using the same sources fixture if none), `tests/integration/db/services-hours-migration.test.ts`

- [ ] **Step 1:** View test: with `contact.hours = "Mon–Fri: 9am – 6pm"` and `officeHours.hours = "{hours}"`, `serviceDetailView(...).sidebar.officeHours.hours === "Mon–Fri: 9am – 6pm"`; plain text without placeholders passes through unchanged. Run → FAIL.
- [ ] **Step 2:** Implement interpolation. Run → PASS.
- [ ] **Step 3:** Migration test: value `"Mon – Fri: 9am – 6pm"` → `"{hours}"` on draft & published; any other value unchanged; NULL published untouched. Run → FAIL; write migration; → PASS.
- [ ] **Step 4:** Seed + meta. Commit `feat(services): office hours read from contact settings`.

### Task 3: Footer login link is editable and can be hidden

**Files:**
- Modify: `lib/schemas/settings/footer.ts` (add `loginLink: link.nullable()` — `link` from `../common`; null hides it)
- Modify: `templates/shared/views.ts:154` (`...(footer.loginLink ? { login: linkView(s, footer.loginLink) } : {})`)
- Modify: `components/admin/settings/settings-meta.ts` footer (label "Staff sign-in link", help "Shown after the legal links. Clear it to hide the link.")
- Modify: `server/db/seed/fixtures/settings.ts` footer (`loginLink: { label: "Login", href: "/admin/sign-in" }`)
- Create: `server/db/migrations/0033_footer_login_link.sql` + journal entry (backfill the seeded value where the key is missing)
- Test: chrome view test (grep `chromeView` under `tests/`), `tests/integration/db/footer-login-migration.test.ts`

- [ ] **Step 1:** View test: `loginLink` set → `legal.login` equals it; `loginLink: null` → `legal.login` is undefined. Run → FAIL.
- [ ] **Step 2:** Schema + view + meta + seed. Confirm the admin schema form renders a nullable `link` (check `components/admin/schema-form/` for an existing nullable link field; reuse its control). Run → PASS.
- [ ] **Step 3:** Migration test (adds key when missing; keeps an existing value; NULL published untouched). FAIL → write migration → PASS.
- [ ] **Step 4:** Commit `feat(footer): make the staff sign-in link editable`.

### Task 4: Branded, editable 404 page

**Files:**
- Modify: `lib/schemas/settings/microcopy.ts` (add `notFound: z.object({ crumb: text, title: text, description: text, homeLabel: text })`)
- Modify: `components/admin/settings/settings-meta.ts` microcopy (group "Page not found")
- Modify: `server/db/seed/fixtures/settings.ts` microcopy (`crumb: "Not found"`, `title: "Page not found"`, `description: "The page you are looking for has moved or no longer exists."`, `homeLabel: "Back to home"`)
- Create: `server/db/migrations/0034_microcopy_not_found.sql` + journal entry (backfill same values where missing)
- Create: `app/(site)/not-found.tsx` — server component; loads site sources the way `app/(site)/[slug]/page.tsx` does; renders the same `PageHero` used by `app/(site)/error.tsx` with `site.defaultHeroImage`, the microcopy above, and a home link. Read `node_modules/next/dist/docs/` on `not-found` first: confirm it renders inside `app/(site)/layout.tsx` (header/footer) and returns status 404.
- Modify: `app/global-not-found.tsx:12-14` — replace the hardcoded metadata with a `generateMetadata` reading `seo.defaults` (try/catch → `{}` if the DB is unreachable), only if the Next 16 docs allow `generateMetadata` there; otherwise leave it and note it in the commit.
- Test: `tests/dom/not-found.test.tsx` (renders title/description/home link from given props), integration or e2e check that `/blog/does-not-exist` returns 404 with the configured title.

- [ ] **Step 1:** Schema/meta/seed + migration with its integration test (FAIL → PASS).
- [ ] **Step 2:** DOM test for the not-found view → FAIL; implement `app/(site)/not-found.tsx` (keep the presentational part a small component under `components/` so the DOM test can render it without the DB) → PASS.
- [ ] **Step 3:** `pnpm build` and hit `/blog/does-not-exist` with `pnpm start` (or the e2e harness) → 404 status, branded page.
- [ ] **Step 4:** Regenerate `tests/unit/blocks/frozen-components.json` if a public component changed. Commit `feat(site): branded 404 page driven by microcopy`.

### Final check

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0.
- [ ] Whole-branch review (opus).

**Out of scope, by decision:** `app/(site)/error.tsx` and `app/global-error.tsx` stay static — they render when the DB or root layout has failed, so they cannot depend on settings.
