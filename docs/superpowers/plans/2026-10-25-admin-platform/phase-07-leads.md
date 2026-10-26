# Phase 7: Integrations, email, leads

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 7.1–7.4). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (B6 no new env, B7 retention 24 months and invisible Turnstile, B8 recipient, §6.5 forms, §4 anti-goals, Review Focus 4). Branch `feat/dynamic-platform`. Never push.

**Goal:** Give CP all of SP's integrations, email and leads features:
- Settings ▸ Integrations screens (SMTP, R2 with its move panel, Turnstile), with write-only encrypted secrets and a test button for each;
- the SMTP mailer with CP-branded lead emails;
- the public leads endpoint (honeypot, invisible Turnstile, DB rate limit), and the `/contact` quote form posting to it instead of `mailto:`;
- the leads inbox (list, board, drawer, detail, notes, status and assignee, CSV), the leads badge, and the 24-month retention purge.

The public site stays at 0 px. That includes `/contact` after the form is wired.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only (`git -C <sp> show 1a9f65d:<path>`). Port the final-state files. Rationale:
- SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-06-media.md` Tasks 1–2 (integrations module and screens; the module is already in CP);
- `phase-07-leads.md` Tasks 1–7 (mailer, public endpoint, form, admin API, inbox UI, purge, e2e);
- mk-parity D3 (lead attribution and the board).

**What CP already has** (ported in earlier phases; don't port again):
- `server/modules/integrations/{repo,routes,service,testers}.ts`, mounted at `/api/v1/admin/integrations`, with the migrate-media routes;
- `lib/schemas/integrations/*`, `lib/schemas/api/integrations.ts`, and `components/admin/integrations/migrate-media-panel.tsx`;
- `server/lib/mailer.ts` (dev default Mailpit `127.0.0.1:1026`, "Cleaning Partners (dev)") and `emails/{layout,invite,reset-password,message-lines}.tsx` (CP layout with `logoUrl`);
- `server/db/schema/leads.ts`, migration 0016, `lib/leads/attribution.ts` (`cp_attribution`, `__cpConsent`), `lib/schemas/settings/leads.ts`, and the seeded `settings.leads` (`recipients: ["info@cleaningpartners.ie"]`, `retentionMonths: 24`, `acknowledgement: false`);
- `LEAD_RATE_LIMIT`, `deleteExpiredRateLimits`, HKDF purpose `lead-ip`, the `lead:*` permissions, the nav Leads item with `badge: "new-leads"`, the topbar `EnquiriesLink`, the dashboard lead KPIs and links, ⌘K lead search, and `turnstile-health`.

**SP files CP lacks** (from `git ls-tree` diffed against `git ls-files`). Each is placed in a task below, or deferred by a ruling:
- `app/(admin)/admin/(panel)/settings/integrations/{page,[slug]/page}.tsx` and `components/admin/integrations/{integration-meta.ts,integration-fields,integration-form,integrations-overview}.tsx`;
- `emails/lead-{notification,acknowledgement}.tsx`;
- `server/lib/turnstile.ts`, `server/modules/leads/{repo,routes,service}.ts`, `lib/schemas/api/leads.ts`, and the SP form hook `components/home/use-turnstile.ts`;
- `app/(admin)/admin/(panel)/leads/{page,[id]/page}.tsx`, `components/admin/leads/*`, `lib/admin/leads.ts`, and `server/lib/jobs/purge-leads.ts`;
- `server/modules/integrations/rotate.ts` and `tests/unit/integrations/rotate.test.ts`. These are deferred to 11.1 (R7-12).
- The tests are listed per task.

## Global constraints for this phase

- The master Global Constraints apply in full, including Review Focus #1 (SP leftovers), #4 (quote-form values) and #5 (public literals).
- Public site at 0 px: every `PUBLIC_URLS` entry at both viewports (visual 44/44). Tasks 4 and 6 touch `components/contact/**` or `templates/**`, so they run `pnpm test:visual` before committing.
- **Never update visual baselines.** Admin baselines for integrations and leads wait for 11.3 (R7-12).
- **No new env vars** (R7-8).
- No new dependencies. nodemailer and react-email are already installed.
- `tests/unit/branding.test.ts` and `tests/unit/public-literals.test.ts` stay green on every task. Ported test fixtures must not use SP-shaped values: no `sp-media` buckets, `sp` folders or "SP Mailer" names (the gate forbids `\bsp[-.][a-z]` and `"sp"`). Use `cp-media`, `media` and "CP Mailer".
- Closure rule as in the earlier phases. List every closure file.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R7-1 Recipient and Mailpit (B8).**
  - The default lead recipient is `info@cleaningpartners.ie`. It comes from the seeded `settings.leads.recipients` (already in the fixture). The service keeps SP's behaviour exactly: it reads the published `settings.leads`, and with no recipients it logs a lead event ("Staff notification not sent…") instead of mailing. No address is hard-coded in the service.
  - Dev and CI mail go to Mailpit on SMTP `127.0.0.1:1026` with the UI/API on `:8026`. These are already in `docker-compose.dev.yml`, `ci.yml`, `server/lib/mailer.ts` and `tests/integration/helpers/mailpit.ts`. No SP port (1025/8025) may appear. The branding gate already forbids them.
  - Test: after a seed, a lead posted to the public endpoint lands in Mailpit addressed to `info@cleaningpartners.ie`, with `Reply-To` set to the visitor.
- **R7-2 CP-branded emails.**
  - `emails/lead-notification.tsx` and `emails/lead-acknowledgement.tsx` use CP's `EmailLayout` (logo via `emailLogoUrl`, brand `#11b1d1` / navy) and CP copy. No security wording: nothing about guards, patrols, alarms, monitoring or "24/7 line".
  - **Notification.** Heading "New quote request". It lists name, email, phone, service, address / Eircode, message, source page and the time received (Europe/Dublin), with an "Open in admin" button to `/admin/leads/<id>`. When no service was picked, the service row shows the published `quoteForm.fields.service.fallback` ("Not sure"); this is where that leaf is now used. When the message is blank, the row is left out.
  - **Acknowledgement.** Heading "Thanks for your quote request". Body "We've received your request and will be in touch shortly." The urgent line is built from `settings.contact.phone24h`. The subject is `We received your request – {siteName}`.
  - `siteName` falls back to "Cleaning Partners", where SP's falls back to "Security Partners".
  - **Subject.** SP builds the notification subject from its mailto-era `sections.contact.form.mailtoSubject`. CP does the same with the published `pages.contact.quoteForm.mailSubject` ("Quote request from {name}"). The leaf stays, and its editor label becomes "Notification email subject". The fallback is `"Quote request from {name}"`.
  - SP's rule stays: no acknowledgement without a verified Turnstile.
- **R7-3 Lead fields (master 7.3, Review Focus 4).** `lib/schemas/api/leads.ts` is SP's, with these CP deltas:
  - `phone` is required ("Enter your phone number"). The frozen form marks it required.
  - `address` is new: `optionalLine(300)`, so a blank value becomes `null`. Migration **0023** (`pnpm db:generate`) adds the nullable `leads.address` column. `company` stays: it is optional and SP-compatible, and CP's form never sends it.
  - `message` is optional, because the frozen textarea has no `required` and no asterisk. A blank message is stored as `""`. The column stays `NOT NULL`, so SP's DTO and UI types don't change.
  - `consent` must be `true` (controller ruling, master 7.3 "consent `true`"): the public lead schema uses `z.literal(true, { error: "Please agree to be contacted" })`, so a missing or false consent gets a 422 with `fieldErrors.consent`. The admin-side DTO type stays SP's boolean. The form sends `consent: true`, and the native `required` checkbox blocks submission before that. Add a `leads-public` test for consent missing or false → 422.
  - **Service is checked by the service layer, not by Zod.** The value must be one of the published service titles (the services collection) or the published `pages.contact.quoteForm.fields.service.extraOptions` (seeded "Domestic Cleaning" and "Other"). Anything else is a 422 with `fieldErrors.service`. A blank value becomes `null`.
  - Lead DTO, detail, drawer and CSV gain `address`. In the CSV, the column "Address / Eircode" goes after "Company".
  - Integration tests in `tests/integration/api/leads-public.test.ts`:
    - "Domestic Cleaning" and "Other" are accepted;
    - a real service title is accepted;
    - `"Window Fitting"` gets a 422 on `service`;
    - a blank address or Eircode is stored as `null`, not `""`;
    - a blank service is stored as `null`.
- **R7-4 Quote form wiring (0 px).**
  - `components/contact/quote-form.tsx` posts JSON to `LEADS_ENDPOINT`, following SP's `contact-form.tsx` flow: an in-flight ref, `turnstile.getToken()`, `sourcePage`, `website`, attribution only with analytics consent, `track("lead_submitted")`, `form.reset()` on success, and `turnstile.reset()` in `finally`. It no longer uses `mailto:`.
  - The fields keep their names: `name`, `phone`, `email`, `service`, `address`, `message`, `consent`.
  - The "Fill the Form" CTAs are links to `/contact#quote` and stay as they are. They reach the same form (spec §6.5).
  - **Frozen markup.** The form's in-flow children, classes and attributes stay as they are. The only additions:
    - `onFocus` (Turnstile `prepare`) on the `<form>`;
    - `disabled={sending}` on the button;
    - the existing `role="status"` `<p>` is reused for success and error feedback. It is `sr-only` until there is feedback, exactly as today.
    - two **absolutely positioned** elements:
      - the Turnstile slot `<div ref className="absolute h-0 w-0 overflow-hidden" />`;
      - the honeypot wrapper `<div aria-hidden="true" className="pointer-events-none absolute top-0 -left-[10000px] h-px w-px overflow-hidden opacity-0">` holding `<input name="website" type="text" tabIndex={-1} autoComplete="off" />`.
  - **Why the honeypot doesn't change the layout.** The `<form>` is `flex flex-col gap-5`. Absolutely positioned children of a flex container take no part in flex layout, so they add no gap and no height. The form is not positioned and must stay that way, so **do not add `relative`**. The honeypot is placed off-screen to the left, and negative-left overflow doesn't create a scrollbar.
  - The honeypot has **no `<label>` text**. JSX text would fail `public-literals.test.ts`, and the field is aria-hidden and unfocusable anyway.
  - The Turnstile hook (SP `components/home/use-turnstile.ts`) is logic, not an SP section view. It is ported to `components/contact/use-turnstile.ts`. The literals test scans only `.tsx`, and the hook loads nothing until the form is first focused, so page load is unchanged.
  - Proof: `pnpm test:visual` passes at 44/44. A DOM test asserts the form's in-flow element children (everything not `absolute`) are the same list as before, in the same order.
- **R7-5 Form copy and the frozen inventory.** The new user-visible strings are template fields (O6) under `pages.contact.quoteForm`:
  - `sendingLabel`: "Sending…";
  - `errorMessage`: "Something went wrong. Please try again, or call us.";
  - `rateLimitedMessage`: "Too many attempts. Please try again in a few minutes.";
  - `sentMessage` becomes the success message. It is reseeded as "Thanks, we've received your request and will be in touch shortly. You can also email us at {email}."

  `QuoteFormProps` drops `mailSubject` and `service.fallback`, which are now server-side only.

  `docs/brief-inventory.json` is frozen at `3689369` and must not be edited. Instead:
  - `tests/unit/templates/inventory.test.ts` gains a commented `POST_BASELINE_PAGE_LEAVES` set (`contact:quoteForm.sendingLabel|errorMessage|rateLimitedMessage`), with a no-stale-entries check like `STRUCTURAL_PAGE_LEAVES`;
  - `tests/unit/templates/fixtures.test.ts` gains a `CHANGED_SINCE_BASELINE` exemption for `pages.contact.quoteForm.sentMessage` (reason: the mailto handoff was removed in 7.3), also with a stale check.

  Existing DB rows get the new keys from the custom data migration **0024** (`drizzle-kit generate --custom`, modelled on SP `0007_contact_form_feedback.sql`):
  - it adds the three keys to `pages.contact` draft, published and its revisions, where they are missing;
  - it replaces `sentMessage` only where it still equals the old mailto seed;
  - it never overwrites an edit.

  Test it like SP's `contact-form-migration.test.ts`.
- **R7-6 Turnstile and rate limit (as SP).**
  - Turnstile is an **integration setting** (`integrations.turnstile`: `enabled`, `siteKey`, `secretKey`, encrypted). It is not an env var.
  - The public `GET /api/v1/public/leads/config` returns the site key only while it is enabled, with `no-store`.
  - The widget is invisible-only (B7).
  - With Turnstile on, a missing or failed token gets 422 before the honeypot check. If the settings can't be read, the lead is kept (SP).
  - Rate limit: SP's `rateLimit(LEAD_RATE_LIMIT)` runs before validation, per IP; 429 carries `Retry-After`.
  - The 64 KB public body limit is already mounted.
  - Mount `publicLeadsRoutes` at `/v1/public/leads` and `leadsRoutes` at `/leads` in `server/api/app.ts`, in SP's order.
- **R7-7 Retention (B7).**
  - Lead retention is 24 months, from the seeded `settings.leads.retentionMonths`.
  - Port `server/lib/jobs/purge-leads.ts` and register `purgeLeadsJob` in `RECURRING_JOBS` (`server/lib/jobs/index.ts`). Update the "arrives in 7.4" comment.
  - The job runs daily. It deletes leads older than the cutoff (SP's `retentionCutoff`, in calendar months) together with their events (cascade). It also deletes expired public rate-limit windows. It writes an audit row with the count.
- **R7-8 No new env vars.** SMTP, R2 and Turnstile are configured only in Settings ▸ Integrations (B6). SP has no Turnstile, SMTP or lead env var, so CP has no renamed equivalent to add. `MAILPIT_URL` is an existing test-harness override (already in `tests/integration/helpers/mailpit.ts`, as in SP), not an app env var. `server/env.ts` is unchanged.
- **R7-9 Leads badge and dashboard (Phase 4 deferral).**
  - `server/lib/admin-shell-extras.ts` takes back SP's lead part: `hasPermission(actor.roles, { lead: ["read"] })` → `leadBadge(actor)` → `badges["new-leads"]`, with SP's `degraded()` helper, and the bell gets that count.
  - SP's AI-status part stays out until 9.3, with a marker.
  - The sidebar badge and the topbar `EnquiriesLink` count then come from real data.
  - Restore SP's `tests/unit/admin/shell-extras.test.ts` and the leads case in `tests/integration/dashboard/shell-notifications.test.ts`. A new unassigned lead shows in the badge and the bell; an editor without `lead:read` gets no badge.
  - `tests/integration/api/dashboard-leads.test.ts` goes back to SP's version: it posts the lead **through `POST /api/v1/public/leads`** (with CP's required `phone`), with `mailer.send` spied, instead of inserting a row.
- **R7-10 Phase 6 deferrals (7.1).**
  - Mount `MigrateMediaPanel` as a child of `IntegrationForm` on the R2 page (`settings/integrations/[slug]/page.tsx`, as SP does).
  - The R2 form invalidates `MIGRATE_MEDIA_QUERY_KEY` on save. On disconnect it invalidates `["integrations"]`, which covers the key's prefix. A DOM test pins both.
  - SP's `AI_STATUS_KEY` invalidations and the `integrations.ai` → `/admin/settings/ai-assistant` redirect: the redirect is kept for parity (that screen arrives in 9.3), and the `AI_STATUS_KEY` lines stay out with a 9.3 marker.
  - Port SP `tests/integration/api/integrations.test.ts`. Editors get 403 on `PUT`, on `DELETE /:key` (add the case if SP lacks it) and on `POST /:key/test`; SP's `GET` 403s for editor and viewer stay too.
  - **`keyPrefix` help text** (`integration-meta.ts`): label "Sub-folder", placeholder `media`. Help text: "Optional sub-folder under this site's fixed `cp/` folder in the shared bucket; files go to `cp/<sub-folder>/…`. Lowercase letters, digits, - and _, folders separated by /. Changing it does not move files already stored, so it cannot change while uploads are stored in R2, and once saved it cannot be cleared." It must not say "sp" or suggest `cp`, which would give `cp/cp/`.
  - **`R2_FOLDER_REQUIRED`** keeps SP's behaviour: a saved sub-folder can't be cleared (O3). The copy changes, because the hard `cp/` root (R6-1) means clearing can no longer reach another site's files: "A sub-folder was saved: it can be changed while no uploads are stored in R2, but not cleared". The ported `integrations.test.ts` asserts this exact message.
- **R7-11 Branding.** Anything new uses `x-cp-*` headers, `cp_` storage keys, `__cp*` globals and `cp:*` events. Test data uses CP names (R7-2, Global constraints). Lead e2e cleanup goes by a CP test address domain (`@e2e.cleaningpartners.test`, or SP's helper shape renamed).
- **R7-12 Deferrals out of this phase.**
  - **9.3:** AI hooks in lead screens (`useAssistantScreen`, `leadAssistantScreen`), `AI_STATUS_KEY`, the AI status in shell extras, and the "share enquiry details" switch. They are stripped with markers, as Phase 4 did for the versioned editor.
  - **11.1:** `server/modules/integrations/rotate.ts` and `rotate.test.ts`, with `secrets:rotate`.
  - **11.3:** admin visual baselines for the integrations overview, SMTP (plus failed), Turnstile, leads (inbox, table, board), the drawer, lead details, activity, notes and the delete dialog. Each task still takes dev screenshots and looks at them.

  The controller records these in the master Changes at phase end.

---

### Task 1: Settings ▸ Integrations screens and tests (master 7.1; R7-8, R7-10)

**Files (port):**
- `app/(admin)/admin/(panel)/settings/integrations/page.tsx` and `[slug]/page.tsx` (with `MigrateMediaPanel` on R2);
- `components/admin/integrations/{integration-meta.ts,integration-fields.tsx,integration-form.tsx,integrations-overview.tsx}`;
- the `R2_FOLDER_REQUIRED` copy in `server/modules/integrations/service.ts` and the `keyPrefix` meta (R7-10).

Use CP copy throughout. SMTP `fromName` defaults to "Cleaning Partners", and no help text names Security Partners. The Settings nav child "Integrations" already exists.

**Tests:**
- Port the integration tests `integrations.test.ts` (CP fixture values; the R7-10 403s and folder copy) and `integrations-smtp-dns.test.ts`.
- The integration tests must show that secrets are write-only and encrypted, and must test the `/:key/test` endpoint for SMTP, R2 and Turnstile (master 7.1 acceptance).
- Port the DOM tests `integration-form.test.tsx` (add: save → `MIGRATE_MEDIA_QUERY_KEY` invalidated; disconnect → `["integrations"]` invalidated; the R2 page renders the move panel) and `integrations-overview.test.tsx`.
- Port the e2e `integrations.spec.ts`: SMTP against Mailpit 1026 with the test button, and a secret that stays write-only after reload.
- Take screenshots of the overview, SMTP and R2 (with the panel) and look at them. Don't save baselines.

**Commit:** `feat: add integrations screens`

---

### Task 2: Lead email templates (master 7.2; R7-1, R7-2)

**Files:**
- port `emails/lead-notification.tsx` and `emails/lead-acknowledgement.tsx`, with CP copy and the `logoUrl` prop;
- adapt the address row (R7-3) and the fallback service wording.

The mailer contract is unchanged: it never throws and never logs bodies or links.

**Tests:**
- Port SP's lead cases in `tests/unit/mailer.test.tsx`: both templates render with CP branding, the logo URL is absolute, the address row appears, a blank message is left out, and no forbidden or security wording appears (assert on the rendered HTML).
- Extend `tests/integration/mail/mailer.test.ts` with a lead notification to Mailpit.

**Commit:** `feat: add cp lead email templates`

---

### Task 3: Public leads endpoint (master 7.3 part 1; R7-1, R7-3, R7-6, R7-9 dashboard)

**Files:**
- port `server/lib/turnstile.ts`, `lib/schemas/api/leads.ts` (R7-3 deltas), `server/modules/leads/{repo,service,routes}.ts` (public half: `submitLead`, `publicFormConfig`, `notifyNewLead`, CP subject and fallback), and the `app.ts` mounts;
- migration `0023` (`leads.address`) and the journal.

The check on the `service` field (R7-3) reads published services and the published contact page through existing queries or repos. It never imports drizzle outside repos.

**Tests:**
- unit: `tests/unit/turnstile.test.ts`, `tests/unit/schemas/leads.test.ts` (phone required, address blank → null, message optional);
- integration: `leads-public.test.ts`, which covers:
  - the R7-3 cases;
  - honeypot → 200 with nothing stored;
  - Turnstile on with a bad token → 422;
  - config returns the site key only while enabled;
  - 429 with `Retry-After`;
  - IP hashed, never raw;
  - notification to `info@cleaningpartners.ie` in Mailpit;
  - no acknowledgement without Turnstile;
  - created event and audit row.
- integration: `leads-attribution.test.ts` and `tests/unit/leads/attribution.test.ts`.
- restore `dashboard-leads.test.ts` to SP's public-endpoint version (R7-9).

**Commit:** `feat: add public leads endpoint`

---

### Task 4: Quote form posts to the leads API (master 7.3 part 2; R7-4, R7-5)

**Files:**
- `components/contact/quote-form.tsx` (R7-4 flow and markup) and `components/contact/use-turnstile.ts` (port);
- `templates/contact/{schema,view,editor-meta}.ts` (new leaves; `mailSubject` and `fallback` are relabelled as server-side and dropped from the props);
- `server/db/seed/fixtures/pages.ts` (new copy);
- custom migration `0024` and the journal;
- the two inventory-test exemptions (R7-5).

`docs/brief-inventory.json` is not touched.

**Tests:**
- Rewrite the `QuoteForm submit` case in `tests/dom/public-client-components.test.tsx`, porting SP's `contact-form.test.tsx`. It must cover:
  - the posted JSON (all seven fields, `consent: true`, `sourcePage`, `website`);
  - the success message (interpolated `{email}`), and the form is reset;
  - 429 → `rateLimitedMessage`; 500 and network failure → `errorMessage`;
  - the button is disabled and shows `sendingLabel` while sending;
  - a double submit sends one request;
  - Turnstile is stubbed; no `mailto:` is ever set;
  - the in-flow children are unchanged (R7-4).
- Update `tests/unit/templates/views.test.ts`.
- Add the 0024 migration test.
- `public-literals.test.ts` and `branding.test.ts` stay green.
- Run `pnpm test:visual`: 44/44 at 0 px.

**Commit:** `feat: wire quote form to the leads api`

---

### Task 5: Leads admin API, badge and retention purge (master 7.4 part 1; R7-7, R7-9)

**Files:**
- port the rest of `server/modules/leads/{repo,service,routes}.ts`: list and filters, detail, status and assignee, notes, delete, CSV (with the Address column), assignees, `leadBadge`;
- `lib/admin/leads.ts`;
- `server/lib/jobs/purge-leads.ts` and its registration in `RECURRING_JOBS`;
- `server/lib/admin-shell-extras.ts` (lead badge, R7-9).

**Tests:**
- integration: `leads.test.ts`, which covers:
  - role 403s (editor and viewer as SP's matrix);
  - filters `open` and `all`, and the assignee `me` / `none`;
  - stale or invalid PATCH;
  - note events;
  - delete audited;
  - CSV formula-guarded, with the header including "Address / Eircode";
  - subject-access export by email;
  - the badge counts new unassigned leads.
- `tests/integration/leads/purge.test.ts` (24-month cutoff, events cascade, rate-limit windows pruned) and `tests/unit/leads-retention.test.ts`.
- Update the scheduler test if it lists jobs.
- unit: `tests/unit/admin/leads.test.ts`.
- Restore the SP versions of `tests/unit/admin/shell-extras.test.ts` and the shell-notifications lead case.

**Commit:** `feat: add leads admin api, badge and retention purge`

---

### Task 6: Leads inbox UI and end-to-end (master 7.4 part 2)

**Files (port):**
- `app/(admin)/admin/(panel)/leads/{page,[id]/page}.tsx`;
- `components/admin/leads/{leads-screen,leads-board,lead-drawer,lead-detail,lead-status-badge,csv-download-button}.tsx` and `use-leads-params.ts`.

Show the address in the detail and the drawer. A lead with no service shows SP's dash in the admin (the fallback wording is for the email only). Strip the AI hooks with 9.3 markers (R7-12).

**Tests:**
- Port the DOM tests `leads-screen.test.tsx`, `leads-board.test.tsx` and `leads.test.tsx`.
- Port the e2e `leads.spec.ts` and `lead-cleanup.ts` against CP:
  - submit the `/contact` quote form in the browser → the lead appears in the inbox with its service and address → status, assignee and note → the Mailpit notification to `info@cleaningpartners.ie`;
  - honeypot filled → no lead;
  - repeated posts → 429 message shown;
  - the lead badge in the sidebar and topbar updates.
- Clean up the leads in `afterAll` so the visual and e2e runs stay deterministic.
- Take screenshots of the inbox, board, drawer and detail, and look at them.
- Run `pnpm test:visual` (the e2e touched `/contact`): 44/44.

**Commit:** `feat: add leads inbox screens`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```

Also confirm the gate's four checks:
- `git grep -n mailto -- components/contact` finds nothing;
- `git diff 3689369 -- docs/brief-inventory.json` is empty;
- `git diff cdc05f3 -- tests/visual/__screenshots__` is empty;
- `server/env.ts` is unchanged since `cdc05f3`.
