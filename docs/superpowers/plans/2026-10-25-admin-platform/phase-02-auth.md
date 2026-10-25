# Phase 2: Auth, RBAC, users, audit, admin chrome base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 2.1–2.6). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md`. Branch `feat/dynamic-platform`. Never push.

**Goal:** Port SP's auth stack (Better Auth with seven roles, 2FA, impersonation and audit), the users module, the operator scripts, and the admin's root layout and sign-in screens in CP colours. By the end of the phase, an owner created with `pnpm admin:create` can sign in at `/admin` and land on a placeholder panel. The public site stays at 0 px.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only. Port the final-state files. SP's `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-02-auth.md` (Corrections at its top, Tasks 1–7) gives the order and the rationale, and its Corrections apply here too: plural Better Auth tables, admin-plugin endpoints closed over HTTP, `ai:use` for every role except viewer, `inviteUrl` always returned, `useSecureCookies` from the `BETTER_AUTH_URL` protocol, `authInterrupts`, and the change-password and impersonation hardening.

## Global constraints for this phase

- The master Global Constraints apply in full: the branding map and its extension (every `sp` identifier becomes `cp`), dev Postgres on 5434, the three env vars, a no-env build, the `server-only` and `lib/` boundaries, and the Playwright config kept as recorded in master Changes.
- The public site stays at **0 px**. `pnpm test:visual` passes 40/40 after Tasks 2.5a, 2.5b and 2.6.
- **Closure rule (replaces Phase 1's transitive rule).** SP's final-state files import across phase lines. For example, `server/lib/mailer.ts` pulls in `server/modules/integrations/{service,testers,repo}`, which pull in `server/lib/{r2-client,ai-target,smtp-target,settings-store}` and `lib/schemas/integrations/**`. When a file you port imports something not yet in CP:
  1. Port it **verbatim (rebranded)** if it is `lib/**`, `server/lib/**`, `server/modules/*/{service,repo,testers,queries,policy,*.ts}` other than `routes.ts`, `emails/**`, or `components/admin/**`. Route files (`server/modules/*/routes.ts`) and admin pages (`app/(admin)/**/page.tsx`) are ported only by the task that names them.
  2. Never port SP's public section components (`components/{home,about,services,blog,contact}/*`), SP `templates/*/render.tsx`/`view.ts`, or `blocks/registry.ts`.
     - **Exception:** `components/home/logo-animation.tsx` is a generic Lottie player used by the admin brand mark, not an SP design. Port it to the same path.
  3. If the closure reaches item 2, use a type-only workaround in the R2 style (Phase 1) with a `// Phase N restores …` comment and list it in the report. Never stub behaviour.
  4. List every closure file in the report.
- **SP content schemas pulled in by the closure** (`lib/schemas/settings/index.ts` with SP keys such as `sections.enquireBanner`) are ported as they are. Task 3.1 replaces the key set with CP's. Their SP *copy and defaults* still get the branding map.
- Commits are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R2-1.** The route-group move happens here (Task 2.5a), following SP's Correction, instead of in master Task 3.4. Master 3.4 keeps only the props-driven work. Next allows a separate `/admin` root layout only when there is no `app/layout.tsx`. The move is a `git mv` plus import paths, gated by 0 px. *(Change note added to the master.)*
- **R2-2.** Admin palette:
  - `lib/theme/cp-admin.ts` (`CP_ADMIN_LIGHT`, `CP_ADMIN_DARK`, `ADMIN_TOKEN_NAMES`) replaces `sp-admin.ts`. It keeps SP's token structure and neutrals and swaps SP's green/mint/navy for CP's: brand `#11b1d1`, brand-deep `#0e93ad`, brand-soft `#e3f6fa`, navy `#28648f`, navy-dark `#1c3f5a`.
  - `primary` = brand-deep (white text needs AA); accent/soft surfaces = brand-soft; sidebar and hero gradients = navy → navy-dark; charts in the brand/navy family.
  - `destructive #b91c1c` / dark `#fca5a5` and `warning #92400e` are kept from SP.
  - `app/(admin)/admin/admin.css` must equal it. SP's `tests/unit/admin/admin-tokens.test.ts` enforces this, and SP's contrast checks in `lib/theme/checks.ts` must pass for light and dark.
  - The preset id is `cleaning-partners`. It must be registered in `PRESET_IDS`/`lib/theme/presets.ts` and used as the theme schema's default admin and site preset. Migration 0010 already seeds `theme.admin.preset = "cleaning-partners"`, so the admin layout's theme read must parse that row. Add a unit test that the 0010 seed value parses with `ThemeConfig`. `lib/theme/*` is ported now, because the pure engine is needed by admin layout theming. The storage, API and Appearance screen wait for Phase 9.
- **R2-3.** Admin brand mark:
  - Without a published brand, the chip shows "CP".
  - With one, it shows the CP logo. Admin layout reads the logo from settings once Phase 3 seeds it. Until then, `brand = null`.
- **R2-4.** E2E project. Restructure `playwright.config.ts` as SP's current file does: `testMatch` per project, plus projects `e2e-setup` and `e2e`.
  - Keep `use.channel: "chromium"` (put it in each project's `use`), the `PW_PORT` default 3200, and the standalone webServer.
  - The webServer command gains `pnpm tsx:server tests/visual/seed.ts`. Until Phase 3, that seed only migrates, resets `cp_e2e` and creates the visual admin users.
  - The test session cookie name is `cp.session_token` (`__Secure-cp.session_token` over https), including the `UNIT_COOKIE` restored in Task 3.
  - The E2E env is `tests/e2e/env.ts` (SP's) with `postgres://cp:cp@127.0.0.1:5434/cp_e2e` and port 3200.

---

### Task 1: Roles and permissions (master 2.1)

**Files:**
- Create (port): `lib/auth/{permissions,matrix,password,redirect}.ts`
- Test (port): `tests/unit/permissions.test.ts` plus SP's other `tests/unit/auth/*` cases covering these files

`lib/auth/roles.ts` exists from Task 1.2. Do not change it.

**Interfaces:** SP's `statements`, `hasPermission()`, `parseRoles()`, `ROLE_GRANTS` and the matrix, verbatim. Testimonials is covered by `collection:*`, so nothing is added.

- [ ] **Step 1:** Port the tests and run `pnpm test:unit`. Expected: FAIL.
- [ ] **Step 2:** Port the files.
- [ ] **Step 3:** Run `pnpm test:unit`. Expected: PASS. The SP matrix test passes unchanged.
- [ ] **Step 4:** Commit: `feat: add roles and permission matrix`.

---

### Task 2: Better Auth, mailer and emails (master 2.2)

**Files:**
- Create (port): `server/auth/{auth,hooks,tokens}.ts`, `server/lib/{audit,cache-tags,settings-store,mailer,smtp-target}.ts`, `server/modules/audit/repo.ts`, `lib/schemas/api/{users,params,audit}.ts`, `emails/{layout,message-lines,invite,reset-password}.tsx`, `app/api/auth/[...all]/route.ts` (if SP mounts Better Auth there; follow SP), plus the closure (integrations service, testers and repo, `server/lib/{r2-client,ai-target}.ts`, `lib/schemas/integrations/**`, `lib/ai/base-url.ts`, …)
- Test (port): `tests/integration/auth/*.test.ts`, `tests/integration/helpers/auth.ts`, `tests/unit/{mailer,…}` for the ported files

**CP deltas:**
- `cookiePrefix: "cp"`.
- Emails:
  - CP name, the logo at `https://<origin>/images/home/logo.png` (absolute from `siteOrigin()`), and CP brand colours (brand `#11b1d1`, navy `#28648f`) in `emails/layout.tsx`.
  - The footer address is "Derryguile, Mountmellick, Co. Laois, R32 YX49" and the email is `info@cleaningpartners.ie`.

**Steps:**

- [ ] **Step 1:** Port the tests and run `pnpm test`. Expected: FAIL.
- [ ] **Step 2:** Port the files and the closure. Apply the CP deltas.
- [ ] **Step 3:** Run `pnpm test`. Expected: SP's auth integration tests pass against `cp_test`:
  - `createUser` produces a uuid v7 id;
  - sign-up is closed;
  - a password shorter than 12 characters is rejected;
  - sign-in works;
  - the session lasts 7 days;
  - cookie names start with `cp.` (or `__Secure-cp.` over https).
- [ ] **Step 4:** Commit: `feat: add better-auth config, mailer and auth emails`.

---

### Task 3: Session DAL, auth middleware, audit API, nav registry (master 2.3)

**Files:**
- Create (port):
  - `server/auth/session.ts`
  - `server/api/middleware/auth.ts`
  - `server/modules/audit/{routes,service}.ts`
  - `lib/admin/{nav,growth-settings,settings-keys}.ts`, needed by `session.ts` (`permissionFor`)
- Modify:
  - `server/api/app.ts`: insert `sessionMiddleware`, `requireSignedIn` before `sameOrigin` on `/v1/admin/*`, and mount the audit routes as SP does.
  - `next.config.ts`: add `experimental.authInterrupts: true`.
- Test (port):
  - `tests/integration/api/audit*.test.ts`
  - `tests/unit/admin/nav*.test.ts`
  - restore the cases Task 1.4 deferred in `tests/unit/api/error-envelope.test.ts`: the `vi.mock("@/server/auth/session")` block, the `UNIT_COOKIE` gating, the "no session → 401" case, and SP's "session before sameOrigin" pin

**CP deltas in `lib/admin/nav.ts`** (spec B2):
- SP's "Insights" item becomes **"Blog"**, with href `/admin/blog` and children under `/admin/blog/*`, `/admin/blog/categories` and `/admin/blog/new`.
- Collections gains a **Testimonials** child at `/admin/collections/testimonials` with permission `{ collection: ["read"] }`.
- ⌘K keywords are updated to match.
- SP's legacy-redirect list (`lib/admin/legacy-redirects.ts`) is **not** ported. CP has no legacy admin URLs.

**Steps:**

- [ ] **Step 1:** Port and adapt the tests (nav tests use the new labels and hrefs). Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files and apply the deltas.
- [ ] **Step 3:** Run `pnpm test`. Expected:
  - `can({ lead: ["read"] })` returns 401 without a session, 403 for an editor, and 200 for intake;
  - a banned user gets 401 on the next request;
  - sign-in, sign-out and failed sign-in are audited;
  - `GET /api/v1/admin/audit` is paginated and filtered;
  - every nav test passes.
- [ ] **Step 4:** Commit: `feat: add session dal, admin auth middleware, audit api and nav registry`.

---

### Task 4: Users module (master 2.4)

**Files:**
- Create (port): `server/modules/users/{routes,service,repo,schema,bootstrap}.ts`
- Modify: `server/api/app.ts` to mount the users routes
- Test (port): `tests/integration/users/*.test.ts`, `tests/integration/api/users*.test.ts`

**Steps:**

- [ ] **Step 1:** Port the tests. Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files.
- [ ] **Step 3:** Run `pnpm test`. Expected:
  - invite returns `inviteUrl` (with `emailDelivered:false` when SMTP is unset);
  - an admin cannot assign or modify an owner;
  - role changes, bans and session revokes are audited;
  - impersonation lasts 1 h, owner rules apply, and it is audited;
  - the last active owner is protected with 409;
  - `POST /users/:id/password-link` works.
- [ ] **Step 4:** Commit: `feat: add users module`.

---

### Task 5a: Public pages into `app/(site)` (master 2.5, part 1; R2-1)

**Files:**
- Move: `app/layout.tsx` → `app/(site)/layout.tsx`, `app/page.tsx` → `app/(site)/page.tsx`, and `app/{about,services,blog,contact}/**` → `app/(site)/…`. Use `git mv`.
- Keep in `app/`: `globals.css`, `favicon.ico` and `api/`. Fix the relative imports, e.g. `./globals.css` → `../globals.css`.

**Steps:**

- [ ] **Step 1:** Run the `git mv` commands and fix the imports. `pnpm typecheck` passes.
- [ ] **Step 2:** Run `pnpm test:visual`. Expected: 40/40 at 0 px. The 404 screenshot must also still match. If Next's built-in 404 now differs because there is no root layout, that is the SP-documented consequence: record it, and the controller rules. Never change the baseline.
- [ ] **Step 3:** Commit: `refactor: move public pages into the (site) route group`.

---

### Task 5b: Admin root layout, CP admin palette, auth pages, proxy, E2E-lite (master 2.5, part 2)

**Files:**
- Create (port):
  - `app/(admin)/admin/{layout,error,not-found,forbidden}.tsx`
  - `app/(admin)/admin/admin.css` (R2-2)
  - `app/(admin)/admin/[...notFound]/page.tsx`
  - `app/(admin)/admin/(auth)/{layout.tsx,sign-in,two-factor,set-password,reset-password,forgot-password}/**`
  - `app/(admin)/admin/(panel)/layout.tsx` (requireSession plus a plain header, per SP's Correction) and the placeholder `(panel)/page.tsx` ("Welcome, {name}")
  - `components/admin/{auth,theme,theme-provider.tsx,providers.tsx,session-provider.tsx}`, and the `components/admin/kit/*` and `components/admin/shell/brand-mark.tsx` that the auth layout needs
  - `components/home/logo-animation.tsx` (closure exception)
  - `components/ui/*` shadcn primitives the auth screens import
  - `lib/theme/*` with `cp-admin.ts` in place of `sp-admin.ts` (R2-2)
  - `lib/auth-client.ts`
  - `proxy.ts`, trimmed in the R4 style: no `blockingMetadataHeaders` until Task 8.1. Redirects resolution comes in Task 8.2 if SP's proxy calls the redirects module.
  - `playwright.config.ts` (R2-4)
  - `tests/e2e/{env,fixtures,seed,global.setup}.ts`
  - `tests/visual/{seed,admin-user}.ts`, Phase 2 subset
  - `tests/e2e/admin-auth.spec.ts`
- Modify: `package.json` script `test:e2e`
- Test (port):
  - `tests/unit/admin/admin-tokens.test.ts` (CP palette)
  - `tests/unit/theme/*` (presets: `cleaning-partners` is the default; contrast checks)
  - `tests/unit/proxy.test.ts`
  - `tests/dom/{auth-layout,two-factor-form,sign-out-errors,admin-brand-logo}.test.tsx` and any other DOM tests for ported components

**Steps:**

- [ ] **Step 1:** Port the tests. Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files. Write `cp-admin.ts` per R2-2, and make `admin.css` match it.
- [ ] **Step 3:** Run `pnpm test`. Expected:
  - admin-token equality passes;
  - the contrast checks pass light and dark;
  - the proxy tests pass (`/admin` without a cookie redirects to `/admin/sign-in?next=/admin`; `X-Robots-Tag: noindex` is set on `/admin/*`).
- [ ] **Step 4:** Run `pnpm test:e2e`. Expected, from SP's `admin-auth.spec` adapted:
  - sign-in redirects correctly;
  - set-password works with an invite token;
  - the 2FA challenge appears when enabled;
  - the 6th sign-in attempt gets 429.
- [ ] **Step 5:** Run `pnpm test:visual`. Expected: 40/40 at 0 px. Admin CSS must never reach public pages; `@source not` excludes CP's public dirs.
- [ ] **Step 6:** Visual check: screenshot `/admin/sign-in` (desktop and mobile) into the report folder and look at it. CP palette and CP brand chip, no SP green.
- [ ] **Step 7:** Commit: `feat: add admin root layout, cp admin palette, sign-in screens and proxy`.

---

### Task 6: Account security and bootstrap scripts (master 2.6)

**Files:**
- Create (port):
  - `app/(admin)/admin/(panel)/account/page.tsx` and its `components/admin/account/**`
  - `scripts/{admin-create,owner-recover,demo-seed}.ts`
  - `scripts/lib/run-script.ts`
  - `server/db/seed/guard.ts`
- Modify:
  - `package.json` scripts `admin:create`, `owner:recover` and `demo:seed` (SP text)
  - `scripts/build-scripts.ts` `SCRIPT_ENTRIES`, to add the scripts SP bundles in the image (admin-create, owner-recover)
- Test (port): `tests/integration/scripts/*`, `tests/unit/seed-guard.test.ts`, `tests/dom/{account-tabs,account-and-states,two-factor-form}.test.tsx`, `tests/e2e/account.spec.ts`

**Steps:**

- [ ] **Step 1:** Port the tests. Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files.
- [ ] **Step 3:** Run `pnpm test && pnpm test:e2e`. Expected:
  - TOTP can be enabled, disabled and used with backup codes;
  - a password change revokes the other sessions;
  - sessions can be listed and revoked;
  - `admin:create` prints a set-password link;
  - `owner:recover` clears 2FA and is audited;
  - `demo:seed` is idempotent (7 users);
  - the guard refuses a non-disposable URL without `--allow-production`.
- [ ] **Step 4:** Manual check: run `pnpm db:migrate && pnpm admin:create --email owner@cleaningpartners.ie --name "CP Owner"`, open the printed link on `pnpm dev`, set a password, sign in, and land on "Welcome, CP Owner". Stop the dev server afterwards.
- [ ] **Step 5:** Run `pnpm test:visual`. Expected: 40/40.
- [ ] **Step 6:** Commit: `feat: add account security and operator scripts`.

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```
