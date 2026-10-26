# Phase 11: Hardening, ops, E2E, launch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 11.1–11.5, plus every Changes item tagged 11.1 / 11.2 / 11.3 / 11.4 / 11.5 / 11.x). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (§2 goals 1 and 4, §4 anti-goals, §5 B6, B7, B11, B12, O7, §6.1 ops scripts and "CI and deploy gating", §10 owner steps). Branch `feat/dynamic-platform`, phase base `1f93507`. **Never push. Never merge to `main`.**

**Goal:** Bring CP to SP's launch state:
- SP's ops scripts, with every R2 key confined to `cp/`;
- SP's security tests, plus written rulings on the launch decisions earlier phases parked;
- SP's remaining E2E specs, and admin visual baselines, all new;
- CI that runs E2E and an image smoke test, and a `deploy.yml` that waits for CI;
- the runbook, the launch checklist and the README for CP, and a recorded definition-of-done run.

After this phase the branch is ready for the owner's cut-over (B11). Cut-over itself, the merge to `main`, is the owner's step and no task here does it.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only (`git -C <sp> show 1a9f65d:<path>`). Port the final-state files. For the rationale and TDD steps, read SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-10-hardening.md` Tasks 1–4, 6, 10–13, but don't copy its wording. SP's Tasks 5, 7, 8 and 9 were already ported with the final-state files in Phases 1–10 (see "What CP already has").

**What CP already has** (from the working tree at `1f93507`; don't port again):
- **Container and server:**
  - `Dockerfile` with `postgresql17-client` and `tini`, `HEALTHCHECK`, and no `VOLUME` line;
  - `docker-entrypoint.sh` (migrate, then `seed.mjs --if-empty`);
  - `docker-compose.yml` with `replicas: 1`, the `db` service and the `cleaning-data:/data` volume;
  - Playwright serving the standalone `server.js`.
- **Security code:**
  - `next.config.ts` security headers (`lib/security-headers.ts`, `DENY` on `/admin`) and `tests/unit/next-config-headers.test.ts`;
  - `secretHint` short-secret rule (`server/lib/crypto.ts`);
  - the https `BETTER_AUTH_URL` production check (`server/env.ts`);
  - `server/lib/ip.ts` (`clientIp` = leftmost `X-Forwarded-For`, else `X-Real-Ip`, else null), byte-identical to SP;
  - Better Auth `advanced.ipAddress.ipAddressHeaders: ["x-forwarded-for", "x-real-ip"]` (`server/auth/auth.ts:157`);
  - `server/db/like.ts`;
  - `tests/integration/users/hardening.test.ts`.
- **Jobs and R2:**
  - the dashboard `failed-jobs` Next-up item (`server/modules/dashboard/{repo,service}.ts`, `lib/schemas/api/dashboard.ts`);
  - the R2 guard: `server/lib/r2-client.ts` has `R2_PREFIX = "cp/"`, `r2ObjectKey` (the only key builder), `cpPrefixGuard` and `assertCpInput`;
  - `tests/unit/storage/{aws-sdk-allowlist,r2-key-grep-guard,r2-prefix}.test.ts`.
- **Scripts and CI:**
  - `scripts/{migrate,seed,demo-seed,admin-create,owner-recover,check-inventory}.ts`, with `assertDisposable` in `seed`/`demo-seed`;
  - `pnpm audit:deps`; `shadcn` is already a devDependency;
  - `.github/workflows/ci.yml` with jobs `static`, `integration` and `build`, and `workflow_call` already declared.

**SP files CP lacks** (SP `ls` diffed against CP). Each one is placed in a task below, or excluded by R11-13:
- **scripts:** `scripts/{backup,restore-drill,secrets-rotate,db-sync,demo-remove,custom-code-off,r2-bootstrap,data-import,data-export-to-r2,check-log-secrets}.ts`.
- **server:**
  - `server/lib/backup/{pg-tools,dump,store,index,restore-drill}.ts`;
  - `server/lib/jobs/backup.ts`;
  - `server/lib/{db-sync,r2-bootstrap,data-export,data-import}.ts`;
  - `server/modules/integrations/rotate.ts`.
- **tests:**
  - unit: `tests/unit/backup/{pg-tools,store}.test.ts`, `tests/unit/{check-log-secrets,ip-hash,like,api-client,site-error,lottie-logo,visual-guard,e2e-coverage,workflows,docs}.test.ts(x)`, `tests/unit/admin/help-guides.test.ts`;
  - integration: `tests/integration/backup/{backup,restore-drill}.test.ts`, `tests/integration/ops/{secrets-rotate,db-sync,r2-bootstrap,data-export,data-import}.test.ts`, `tests/integration/scripts/custom-code-off.test.ts`, `tests/integration/security/{cross-origin,no-secrets-in-logs}.test.ts`;
  - e2e: `tests/e2e/{roles,password-reset,security-headers,lottie-logo,admin-a11y}.spec.ts`, `tests/e2e/media-pins.ts`;
  - visual: `tests/visual/{admin-shell,admin-screens,consent-banner}.spec.ts`.
- **repo files:** `.github/dependabot.yml`, `docs/{runbook,launch}.md`.
- **existing files that need SP's changes:**
  - `.github/workflows/ci.yml` (the `e2e` and `image` jobs);
  - `.github/workflows/deploy.yml` (the `ci` and `ensure-env` jobs, pinned actions, `environment: production`);
  - `docker-entrypoint.sh` (data import, R2 bootstrap);
  - `scripts/build-scripts.ts` (`SCRIPT_ENTRIES`);
  - `server/lib/jobs/index.ts` (`backupJob`);
  - `package.json` (scripts only);
  - `components/admin/help/help-view.tsx` (the Guides card);
  - `README.md`.

**Deferral markers in the tree at `1f93507`.** Each one is closed in the task named:

| Marker | Task |
|---|---|
| `docker-compose.yml:17,19,46` "(added in Task 11.1; not active yet)", and "folder, default cp" | 4 |
| `docker-entrypoint.sh:8` "bootstrap (added in Task 11.1; not active yet)" | 4 |
| `server/lib/jobs/index.ts:31-34` "backup arrives in 11.1" | 1 |
| `tests/unit/storage/aws-sdk-allowlist.test.ts` "the backup store in 11.1 … must be added here explicitly" | 1, 4 |
| `.github/workflows/ci.yml:43-44` "remove --passWithNoTests once Phase 2 adds dom tests" | 11 |
| `tests/e2e/integrations.spec.ts:186-189` Mailpit `test.skip` (needs an RFC 1918 host) | 11 |

## Global constraints for this phase

- The master Global Constraints apply in full. In particular:
  - **Review Focus #1, SP leftovers.** Ported ops code has many: `sp-<db>-<stamp>` backup names, `sp-backup-`/`sp-drill-`/`sp-sync-`/`sp-export-`/`sp-import-` tmpdir prefixes, `PGAPPNAME: "sp-ops"`, `SP_R2_*`, `SP_IMPORT_*`, `security.raynx.ie`, `security-partners-db`, the SP compose id, "Security Partners" in docs and test names.
  - **Review Focus #2, R2 confinement.** This is the main risk of this phase (R11-2).
- **No push, no merge.** No task runs `git push`, `git merge` into `main`, `gh pr merge`, or any Dokploy or GitHub API call. Task 11 edits `deploy.yml`, but it has no effect until the owner merges (R11-9).
- **Public site at 0 px.** All 48 existing baselines stay at 0 px: 44 public plus 4 builder fixtures.
  - **The 48 PNG files are never rewritten.** Never run `pnpm test:visual:update`. Never run `--update-snapshots` without a spec path. Never run it on `public-pages.spec.ts`, `builder-pages.spec.ts` or `builder-copy.spec.ts`.
  - New baselines come only from `pnpm exec playwright test tests/visual/<NEW spec> --update-snapshots=missing` (R11-7).
  - Tasks touching `app/(site)/**`, `templates/**`, `components/**` (non-admin), `proxy.ts` or `next.config.ts` run `pnpm test:visual` before committing.
- **No new app env vars.** `server/env.ts` is unchanged at the gate. Operator scripts may read **input-only** variables (R11-3): `OLD_BETTER_AUTH_SECRET`, `DEMO_PASSWORD` (exists), `CP_R2_ACCOUNT_ID`, `CP_R2_ACCESS_KEY_ID`, `CP_R2_SECRET_ACCESS_KEY`, `CP_R2_BUCKET`, `CP_R2_PREFIX`, `CP_IMPORT_KEY` and `CP_IMPORT_SOURCE_SECRET`. The app never reads them.
- **No new dependency.** `package.json` changes only in `scripts`, and `pnpm-lock.yaml` is unchanged. `@axe-core/playwright` 4.13.0 is installed.
- **No new migration.** Nothing here needs one: backups use `pg_dump`; the import marker is the settings row `ops.data-import`, as in SP; rotation rewrites existing columns. If a task finds it needs one, it is `0025`, and the task **stops and reports** before writing it.
- **Branding and literals.** `tests/unit/branding.test.ts` and `tests/unit/public-literals.test.ts` stay green on every task. New test titles, fixtures, log lines and docs say Cleaning Partners / `cp`. The only "Security Partners" allowed is the group-companies row, plus docs that cite the SP reference repo.
- **Secrets are never logged** (R11-5). No new `console.*` call prints a URL with a password, a secret, a token or an env value.
- **Scripts refuse non-disposable databases** wherever SP's do (R11-4).
- E2e and visual specs that create rows (pages, redirects, media, drafts) delete them in `finally`, so later specs see the seed.
- Only one agent at a time runs Playwright, `next build` or `docker build`.
- Commit after every task, staging only your paths. Messages are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R11-1 Port SP's final state, CP deltas only.**
  - Every file in the "lacks" list is SP's `1a9f65d` version, with the branding map, CP content and the deltas named here. SP's tests come with it, adjusted for CP values.
  - A task report names every behavioural difference from SP. The allowed ones are R11-2's R2 key layout, R11-9's optional R2 inputs in `ensure-env`, and the CP-only baselines in R11-7.

- **R11-2 R2: every key under `cp/`** (O7, B12, Review Focus 2; Phase 6 deferrals).
  - **The key builder.** Every R2 key or list `Prefix` in new code comes from `r2ObjectKey(config, …)` in `server/lib/r2-client.ts`. No new code concatenates `"cp/"`, `R2_PREFIX` or `keyPrefix`. `tests/unit/storage/r2-key-grep-guard.test.ts` must keep passing without widening its allowlist.
  - **SP's layout and CP's.** SP builds `<keyPrefix>/backups/` and `<keyPrefix>/bootstrap/`, where `keyPrefix` defaults to `sp`. CP builds:
    - backups at `r2ObjectKey(cfg, "backups/")`, which is `cp/backups/…`, or `cp/<folder>/backups/…` when a folder is set;
    - the data export and import at `r2ObjectKey(cfg, "bootstrap/<stamp>.dump")`.
  - **Clients.** The backup store and the export/import use `createR2Client` / `sharedR2Client`, so `cpPrefixGuard` is on every command they send. They never build their own `S3Client`.
  - **The AWS SDK allowlist.** `server/lib/backup/store.ts` and `server/lib/data-export.ts` (and `data-import.ts` if it imports the SDK) are added to `ALLOWED` in `tests/unit/storage/aws-sdk-allowlist.test.ts` only after the R11-2 tests below pass. The task report quotes each file's key-building lines.
  - **Pruning.** `pruneBackups` lists with `Prefix = r2ObjectKey(cfg, "backups/")`. The unit test feeds the list a stub page that also contains foreign keys (`sp/backups/sp-sp-…dump`, `backups/x.dump`, `cp/media/x.dump`, `cp/backups/../x`). The assertions:
    - the store ignores every foreign key and never deletes one;
    - every Delete key starts with `r2ObjectKey(cfg, "backups/")`;
    - with retention 14 and 16 CP dumps, it deletes exactly the 2 oldest `.dump` files and their `.json`.
  - **CopySource.** `assertCpInput` rejects a `CopySource` whose bucket is not the client config's bucket (Phase 6 and 8 deferrals). For that, `cpPrefixGuard` gets the bucket from `createR2Client(c)`. Tests:
    - `other-bucket/cp/x` is refused;
    - `<bucket>/sp/x` is refused;
    - `<bucket>/cp/x` passes;
    - a URL-encoded `..` is refused.
  - **`r2:bootstrap`.** `CP_R2_PREFIX` is an optional sub-folder under `cp/` and defaults to `""` (`DEFAULT_R2_PREFIX = ""`). It is validated with the integration schema's `R2_KEY_PREFIX_PATTERN`. Tests:
    - `CP_R2_PREFIX=cp` is refused with a message saying keys are already under `cp/`, so it never produces `cp/cp/`;
    - unset gives `keyPrefix: ""`;
    - `site-a` gives `keyPrefix: "site-a"`.
  - **Backup names.** Backups are named `cp-<db>-<UTC stamp>.dump` plus `.json`. The store's name filter accepts only `cp-<this db>-` names.

- **R11-3 Input-only operator variables.** The variables listed in the Global constraints are read only by `scripts/*.ts` or by `server/lib/{r2-bootstrap,data-import}.ts` when a script calls them. `tests/unit/env.test.ts` keeps pinning the app's env key set. Each script's header comment says the variable is input-only and never printed.
  - Values are passed to `pg_dump`/`pg_restore` through `PGPASSWORD`, never argv.
  - The `secrets:rotate` old secret comes from `OLD_BETTER_AUTH_SECRET` or `--from-secret` (SP).

- **R11-4 Non-disposable databases** (SP parity, kept and tested):
  - **`db:sync`** requires `--confirm <target database name>`. It refuses when the source and target are the same database, or when the confirm name doesn't match.
  - **`restore-drill`** only ever creates and drops `<db>_restore_drill`. It refuses a derived name that fails `^[a-z0-9_]{1,63}$`, and never touches the live database.
  - **`data:import`** does nothing without `CP_IMPORT_KEY`, or when the `ops.data-import` marker already holds that key.
  - **`demo:remove`** runs under the owners lock. It refuses when no real active owner would remain.
  - **`custom-code:off`** only writes `settings.customCode`. It is the documented kill switch, and needs no guard beyond SP's.
  - **`seed` and `demo-seed`** keep `assertDisposable`.
  - **Integration tests** for these scripts use only `cp_test` or names derived from it (`cp_test_restore_drill`, `cp_test_sync_*`). `tests/integration/db.ts` `assertCpTestDatabase` must not be widened to admit them. Derived scratch names go through their own SP checks.

- **R11-5 No secrets in logs.**
  - `runPgTool` redacts the password (`***`) in errors.
  - `scripts/check-log-secrets.ts` (SP) scans a log for:
    - the known test secrets (`SERVER_ENV.BETTER_AUTH_SECRET`, the E2E and visual passwords, the SMTP sentinel);
    - single-use tokens in URLs.

    CI runs it over the E2E log (Task 11).
  - `tests/integration/security/no-secrets-in-logs.test.ts` (SP) captures `console.*` during sign-in, a wrong password, SMTP save and test, and a reset request, then asserts no sentinel appears.

- **R11-6 Launch decisions** (Phase 7, 8 and 10 deferrals tagged 11.2). The default is **SP parity**: O3 keeps core features exactly as SP has them. Each decision is pinned by a test and written into the runbook.
  - **`clientIp` and the proxy chain.**
    - **Recommended default: no code change.** `clientIp` stays leftmost-XFF, and Better Auth's `ipAddressHeaders` stay as they are. Production must run in this shape:
      - Dokploy's Traefik terminates TLS for `cleaning.raynx.ie`;
      - its public entrypoint keeps `forwardedHeaders` untrusted (no `insecure`, no `trustedIPs`), so Traefik replaces any client-sent `X-Forwarded-For` with the peer address;
      - port 3000 is never published on the host.
    - **If Cloudflare proxies the hostname** (orange cloud), the owner adds only Cloudflare's IP ranges to the entrypoint's `forwardedHeaders.trustedIPs`. The leftmost XFF is then still the visitor. This is a Traefik config change, not a code change.
    - **Not chosen:** `CF-Connecting-IP`. Keying on it would let anyone who reaches Traefik directly forge it.
    - **What the owner must confirm** (launch doc "Owner must confirm"):
      - (a) whether the `cleaning.raynx.ie` DNS record is DNS-only or proxied through Cloudflare;
      - (b) that the Traefik public entrypoint has no `forwardedHeaders.insecure` and no `trustedIPs` other than Cloudflare's ranges;
      - (c) that the compose app publishes no host port.

      The answers are expected to match SP's `security.raynx.ie` on the same Dokploy server.
    - **Tests** (Task 5):
      - `tests/unit/ip.test.ts` gains: a multi-value XFF gives the leftmost value; whitespace is trimmed; a blank XFF falls back to `X-Real-Ip`; nothing gives null;
      - a config pin asserts `auth.ts` keeps `ipAddressHeaders: ["x-forwarded-for", "x-real-ip"]` and sets no `trustedProxies`.
  - **A null IP** shares one rate-limit bucket (SP parity). This happens only when no proxy header is set, which the shape above rules out. Runbook "Client IPs and Traefik".
  - **422 retries count toward `LEAD_RATE_LIMIT`** (SP parity). A visitor who fails validation 5 times waits like anyone else. Pinned by an integration case in `tests/integration/leads/` (add it if missing).
  - **A Turnstile siteverify outage returns 422** (SP parity: fail closed, so the lead is not stored). The visitor sees the form's error and can retry. Pinned by an integration case with a stubbed siteverify failure (add it if missing). Runbook "Known limitations". The launch doc tells the owner that turning Turnstile on means accepting this.
  - **Proxy lookup cost** (Phase 8 and R10-18). `resolvePublicPath` runs one indexed query per detail page, unknown path or `/p/*` (two for a missing `/p/*`), with no statement timeout. **No timeout race** (SP parity). A race that fails open would serve a 200 where a 301 or 404 is due; one that fails closed would 404 live pages under load. Runbook "Known limitations" records it, with the Traefik `rateLimit` advice.
  - **CSP for custom code:** no Content-Security-Policy header (SP parity). Custom code and tracking need inline loaders and third-party hosts. The runbook section "Custom code and Content-Security-Policy" says what a future CSP must allow. `tests/unit/next-config-headers.test.ts` gains a case asserting no `Content-Security-Policy` header is emitted, so adding one is a deliberate change.

- **R11-7 Admin visual baselines without touching the 48.**
  - **New files.** Three new spec files: `tests/visual/admin-shell.spec.ts`, `tests/visual/admin-screens.spec.ts` (built across Tasks 8–10) and `tests/visual/consent-banner.spec.ts`.
    - Each starts with `test.skip(process.platform !== "darwin", "visual baselines are macOS-only")`.
    - They run in the existing `desktop` and `mobile` projects. `playwright.config.ts` is unchanged.
  - **Names.** Every new PNG is `admin-<screen>-<light|dark>-<desktop|mobile>.png`, `admin-shell-*.png`, or `consent-*.png`, as in SP's `shot()` helper. Screens follow CP's naming: Blog, not Insights (B2). The `articles` and `article-*` shot names are kept, because they name CP's article screens.
  - **Creating them:** `pnpm exec playwright test tests/visual/<that spec> --update-snapshots=missing`. Playwright 1.64 writes only missing files, and a baseline that already exists still has to match.
  - **Checking them:**
    - look at every new PNG before committing;
    - then `pnpm test:visual` twice, all green;
    - `git diff --name-status 1f93507 -- tests/visual/__screenshots__` lists only `A` lines with the names above. Any `M` or `D` fails.
  - **Pinned or masked:** times, greetings, counts and audit rows, as in SP (dashboard and audit data via `page.route`, `freezeUploads` and `pinMedia` for media, `ai-pins.ts` for the assistant).
  - **Already in CP.** `tests/visual/seed.ts` already seeds `VISUAL_{ADMIN,EDITOR,OWNER,AUTHOR}`. Extend it only for data a screen needs, such as a custom page row, a populated redirects list or leads. Every addition must leave the 48 at 0 px.
  - **Not baselined:** Help. Task 12 changes it (the Guides card), and the master never asked for it.

- **R11-8 E2E ports.**
  - **Ported:**
    - `roles.spec.ts`, every role, with the Appearance, Design, AI assistant and builder rows (Phase 9 and 10 deferrals);
    - `password-reset.spec.ts`;
    - `security-headers.spec.ts`, on `/`, `/services`, `/blog`, `/contact` and `/admin/sign-in`;
    - `lottie-logo.spec.ts`, with CP's `tests/fixtures/lottie` (CP has `settings.site.logoAnimation`);
    - `admin-a11y.spec.ts`, every CP admin screen in light and dark with its overlays, plus `/admin/appearance`, `/admin/design`, `/admin/settings/ai-assistant`, `/admin/pages/custom/<id>`, the SEO, redirects and marketing screens, and the leads and integrations screens;
    - `media-pins.ts`, with CP fixtures.
  - **The coverage test.** `tests/unit/e2e-coverage.test.ts` maps each launch-critical flow to the real `file` + `title` that proves it. CP's list:
    - sign-in per role;
    - invite → set password;
    - reset;
    - 2FA on and off;
    - edit and publish a page → visible;
    - author cannot publish;
    - quote form → lead;
    - media upload;
    - redirect works;
    - builder create → publish → view;
    - consent banner;
    - AI setup.
  - **The visual guard.** `tests/unit/visual-guard.test.ts` requires the darwin guard in every `tests/visual/*.spec.ts`. That includes `builder-copy.spec.ts`, which gains the line. Its comparison is in-run, so no baseline is affected.

- **R11-9 CI and deploy gating** (master 11.4; Phase 1 deferral).
  - **`ci.yml` gains SP's `e2e` job:**
    - Postgres 17.11 on `5434:5432` with `cp_dev`, then `cp_test` and `cp_e2e` created;
    - Mailpit `axllent/mailpit:v1.31.4` on `1026:1025` and `8026:8025`;
    - `pnpm test:e2e 2>&1 | tee e2e.log`, then `pnpm exec tsx scripts/check-log-secrets.ts e2e.log`;
    - artifacts uploaded on failure.
  - **`ci.yml` gains SP's `image` job:**
    - builds the image with no push;
    - runs it against a service Postgres with a smoke env file of exactly the 3 variables;
    - checks readiness, `/` 200, the `[db:seed] empty database (no pages): content seeded` log line and the second-run "auto-seed skipped" line;
    - checks loopback `wget` from inside the container;
    - runs `backup.mjs` and then `restore-drill.mjs` inside the container.
  - **Other `ci.yml` changes:**
    - `--passWithNoTests` and its comment are removed from the dom step;
    - visual tests stay macOS-only and are not in CI.
  - **`deploy.yml` becomes SP's:**
    - **Triggers.** `on: push: branches: [main]` plus `workflow_dispatch` with a `skip_ci` input. The trigger list is unchanged.
    - **Gating.** A first job `ci: uses: ./.github/workflows/ci.yml`, then `build-and-push` (`needs: ci`). Each job checks `if: … github.ref == 'refs/heads/main' && (needs.ci.result == 'success' || (workflow_dispatch && skip_ci))`. Least-privilege `permissions` on each job, and SHA-pinned actions.
    - **`ensure-env`.** Uses CP values: `COMPOSE_ID: kbL1xMktOKmL7i2YfGt-W`, `SITE_URL: https://cleaning.raynx.ie`, and `DATABASE_URL postgres://cp:<pw>@cleaning-partners-db:5432/cp`. Its repo secrets are `CP_R2_*`, `CP_IMPORT_KEY` and `CP_IMPORT_SOURCE_SECRET`.
    - **`deploy`.** `environment: production`.
  - **Dormant until the merge.** The run only starts on a push to `main`, and every job checks `refs/heads/main`. So nothing runs from `feat/dynamic-platform`, and nothing runs at all until the owner merges. `tests/unit/workflows.test.ts` pins both facts.
  - **CP deltas in `ensure-env`** (named behavioural differences):
    - it adds `CP_R2_*` only when their repo secrets are set, so a deploy without R2 is not blocked. Spec §10 has the owner enter R2 in Settings ▸ Integrations, so R2 is optional;
    - it never adds `CP_R2_PREFIX`: the default `""` means `cp/` at the bucket root (R11-2).

    It still only **adds** missing keys and never changes an existing value. So if the owner sets `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` by hand first (spec §10), those values are kept.
  - **`.github/dependabot.yml`** is SP's: GitHub Actions and npm, weekly, grouped.
  - **The Mailpit e2e in CI.** "Test connection reaches the dev Mailpit" needs an RFC 1918 host address. GitHub runners have one (10.x), and the CI Mailpit service publishes on all interfaces. The e2e job asserts the test **ran**, by grepping `e2e.log` for its title without `skipped`. If it can't run, the task records it in `docs/runbook.md` "Known limitations" as an accepted skip and drops the grep, and its report says why.

- **R11-10 Docs** (master 11.5; Phase 4, 7, 8, 9 and 10 deferrals).
  - **`docs/runbook.md`**, SP's sections for CP. It also gets these CP sections:
    - "R2 folder and bootstrap": `cp/` root, optional sub-folder, shared bucket, never set a lifecycle rule from CP;
    - "Import local data into production";
    - "Page builder": `/p/<slug>`, Copy to new page, the blog copy exception, the redirect on rename, deleting with a redirect home, and the visual-only fixture pages;
    - "AI assistant": the key is entered in Settings with no env var, and Test connection and List models are there; the strict allow-list and the lock-out it can cause; the share switch; an impersonating admin can read the target's conversations;
    - "Appearance (theme)";
    - "Verify domains by DNS";
    - "Custom code and Content-Security-Policy";
    - "Rate limits at the proxy (Traefik)".
  - **"Known limitations"** lists every R11-6 decision and every won't-fix row of the sweep that a user can notice.
  - **`docs/launch.md`** (`# Launch checklist: cleaning.raynx.ie`) has three sections: "Agent did", "Owner must do" (spec §10 steps first, in spec order, then the rest), and "Owner must confirm" (Task 12 lists them).
  - **The README** is the project's: what it is, dev setup, scripts, checks and development notes. The dev setup line is `docker compose -f docker-compose.dev.yml up -d --wait && pnpm db:migrate && pnpm db:seed && pnpm demo:seed`.
  - **`docs/brief.md` "Changes"** gains the Phase 1–11 deviations that a reader of the brief would otherwise miss.
  - **Help "Guides" card** (Phase 4 deferral). SP's `FormCard id="help-guides"` with `HELP_GUIDES`, under CP's existing Help topics. `tests/unit/admin/help-guides.test.ts` pins each guide to a `## ` heading in `docs/runbook.md`.
  - **`tests/unit/docs.test.ts`** is SP's, with CP strings:
    - the runbook headings;
    - the launch must-haves `dokploy-network`, `demo:remove`, `Invisible`, `Object Read & Write`, `GDPR processor` and `productionUrl`;
    - "run exactly one app container" in both docs, and compose `replicas: 1`;
    - `seed.mjs --if-empty`;
    - the README dev line;
    - the brief Changes strings that Task 12 adds.

- **R11-11 No change to the visual contract or public code.** `tests/visual/{urls,public-pages.spec,builder-pages.spec}.ts`, `playwright.config.ts`, `components/{home,about,services,contact,blog}/**` and `docs/brief-inventory.json` are unchanged at the gate. The only exception is `builder-copy.spec.ts`, which gains the one darwin-guard line (R11-8).

- **R11-12 Phase base and closure.** Every task closes the markers it owns from the table above. Each report lists the closure files and every behavioural difference from SP.

- **R11-13 Not ported.**
  - `tests/e2e/legacy-redirects.spec.ts`: CP has no legacy admin URLs (master 1.5).
  - `docs/platform-starter-prompt.md`: it is SP's own bootstrap prompt.
  - SP's Insights-named or SP-content baselines.
  - SP's `ADMIN_LEGACY_REDIRECTS`.
  - Anything for the newsletter.

## Deferred findings sweep

Every item tagged 11.x in the master Changes, with its disposition. "Won't fix" items a user can notice also go into runbook "Known limitations" (Task 12).

| Source | Finding | Disposition |
|---|---|---|
| Phase 1 | CI `image` smoke job | **Task 11** |
| Phase 4 | Help "Guides" card once `docs/runbook.md` exists | **Task 12** |
| Phase 6 | `assertCpInput` CopySource bucket check | **Task 4** (R11-2) |
| Phase 6 | backup store in `ALLOWED` only after review | **Task 1** (store), **Task 4** (export/import) |
| Phase 6 | backup prune lists `r2ObjectKey(cfg,"backups/")`; nothing outside `cp/backups/` is ever seen | **Task 1** |
| Phase 6 | `r2:bootstrap` `CP_R2_PREFIX` sub-folder default `""`; stale compose comment | **Task 4** |
| Phase 6 | port `tests/integration/ops/r2-bootstrap.test.ts` | **Task 4** |
| Phase 6 | `media-pins.ts`, admin a11y and admin-screens; media and R2 baselines | **Task 7** (pins, a11y), **Task 9** (baselines) |
| Phase 7 | `rotate.ts` + test (`secrets:rotate`) | **Task 3** |
| Phase 7 | `clientIp` proxy chain; null IP | **Task 5** (R11-6 pins), **Task 12** (launch confirm) |
| Phase 7 | 422 retries count toward the limit; Turnstile outage → 422 | **Task 5** (SP parity, pinned) |
| Phase 7 | baselines for integrations, SMTP and failed, Turnstile, R2 and move, leads, drawer, detail, activity, notes, delete and CSV dialogs | **Task 9** |
| Phase 7 | Mailpit e2e in CI or an accepted skip | **Task 11** (R11-9) |
| Phase 7 11.x | 0024 revision assertion skips the per-field `error` keys | **Task 6** (test strength) |
| Phase 7 11.x | 0024 skips rows whose `quoteForm.fields` is not an object | Won't fix: the migration is applied and seeded rows are objects; no new migration |
| Phase 7 11.x | the consent error has no editor help text | **Task 6** (editor-meta help; `pnpm test:visual` because it is under `templates/`) |
| Phase 7 11.x | "Please shorten your message." shown for any `message` 422, including control characters | Won't fix: control characters reach the field only through scripts; wording is template data |
| Phase 7 11.x | the attribution case reads `lead_events` from the DB, not SP's DTO | **Task 6** |
| Phase 7 11.x | `lead-cleanup.ts` lists only `pageSize=100` | **Task 6** (page until empty) |
| Phase 8 | `custom-code:off` script + test | **Task 3** |
| Phase 8 | proxy lookup cost; CSP; `check-log-secrets` | **Task 5** (R11-5, R11-6) |
| Phase 8 | baselines for SEO overview, sheet, defaults, redirects, dialog, CSV preview, marketing ×4; banner-on public baselines; a11y URLs | **Task 10**, **Task 7** |
| Phase 8 | runbook "Custom code and Content-Security-Policy", "Verify domains by DNS"; robots noindex; `productionUrl` | **Task 12** |
| Phase 8 11.x | the attribution e2e lacks referer-strip and escaped-markup asserts | **Task 6** |
| Phase 8 11.x | a junk `__prerender_bypass` cookie skips the slug check (soft 404) | Won't fix: SP parity; it affects only the client sending the junk cookie |
| Phase 8 11.x | `banner-preview-style` test is brittle | **Task 6** (match the named tokens only) |
| Phase 8 11.x | Cookie-settings pill contrast | **Task 12** (owner note; public design frozen) |
| Phase 8 11.x | OG eyebrow repeats the site name on the home card | Won't fix: SP behaviour |
| Phase 8 11.x | `tag.redirects` expired but unread | Won't fix: no cache reads it; the existing comment stays |
| Phase 9 | `secrets:rotate` re-encrypts `integrations.ai.apiKey` | **Task 3** (a named test case) |
| Phase 9 | baselines for Appearance light and dark, Design, assistant empty, history and reply; a11y URLs; `roles.spec.ts` with Appearance and AI rows | **Task 10**, **Task 7**, **Task 6** |
| Phase 9 | AI GDPR processor confirm; contrast note; runbook "AI assistant" | **Task 12** |
| Phase 9 11.x | previewer without `appearance:read` sees the draft theme; Appearance autosave has no unload guard; `alt`/`href` hidden from the model; closing the panel doesn't abort the stream; customCode and tracking count as site copy | Won't fix: SP parity; listed in Known limitations |
| Phase 9 11.x | the `ai-setup` e2e Insert leaves a home draft row | **Task 6** (discard in `finally`) |
| Phase 10 | proxy lookup cost includes `/p/*` | **Task 5** (R11-6) |
| Phase 10 | Pages list with a custom row; builder baselines; a11y `/admin/pages/custom/<id>`; builder rows of `roles.spec.ts` | **Task 8**, **Task 7**, **Task 6** |
| Phase 10 | runbook "Page builder" | **Task 12** |
| Phase 10 11.x | deleting a published page without `redirectHome` leaves earlier redirects pointing at a 404 | Won't fix: same as services and articles (SP parity); runbook "Page builder" |
| Phase 10 11.x | `exclusive()` doesn't re-check the conflict after waiting on a 409 save | Won't fix: SP parity; the next save surfaces the 409 |
| Phase 10 11.x | the visual fixture stats ("20+ Years") disagree with About | Won't fix: visual-only fixture; fixing it rewrites 4 frozen baselines |
| Phase 10 11.x | `D5.x` review ids left in `server/modules/preview/guard.ts`, `server/modules/redirects/service.ts`, `tests/unit/permissions.test.ts`, `tests/unit/seo/redirects.test.ts` | **Task 6** (comments only) |
| Phase 10 11.x | the assistant cannot search builder pages; `stats` has no item max | Won't fix: SP parity / CP schema |

---

### Task 1: Backups, the backup store, the daily job (master 11.1 part 1; R11-2, R11-5)

**Files:**
- Create:
  - `server/lib/backup/{pg-tools,dump,store,index}.ts`;
  - `server/lib/jobs/backup.ts`;
  - `scripts/backup.ts`.
- Modify:
  - `server/lib/jobs/index.ts`: append `backupJob` and remove the 11.1 marker;
  - `scripts/build-scripts.ts`: `"backup"` in `SCRIPT_ENTRIES`;
  - `package.json`: the `"backup"` script;
  - `tests/unit/storage/aws-sdk-allowlist.test.ts`: `server/lib/backup/store.ts` in `ALLOWED`, and the 11.1 line removed from the comment.
- Test:
  - `tests/unit/backup/{pg-tools,store}.test.ts`;
  - `tests/integration/backup/backup.test.ts`;
  - `tests/unit/jobs-registry.test.ts` (it now lists `backup`).

**Interfaces:** SP's, unchanged (SP phase-10-hardening Task 1 "Produces"), except:
- `backupBaseName(db, now)` returns `cp-<db>-<stamp>`;
- tmpdir prefix `cp-backup-`;
- `PGAPPNAME: "cp-ops"`;
- `r2BackupStore(config, client?)` builds every key with `r2ObjectKey(config, "backups/<name>")` and lists with `Prefix: r2ObjectKey(config, "backups/")`.

The dashboard `failed-jobs` item already exists: don't re-add it.

**Steps:**
- [ ] Copy SP's files and tests from `1a9f65d`, then apply the branding map and the deltas above.
- [ ] Write the R11-2 store tests first (stub `S3Client` whose `send` records commands; a list page with foreign keys). Run them, and see them fail against a naive `config.keyPrefix + "/backups/"` build.
- [ ] Implement `store.ts` on `r2ObjectKey` and `sharedR2Client`/`createR2Client`.
- [ ] Add the store to `ALLOWED`. Run `pnpm test:unit -- storage backup`.
- [ ] Run `pnpm db:up`, then `pnpm test:integration -- backup`: a dump of `cp_test`, the manifest counts and the excluded rate-limit data. Then `pnpm backup` against `cp_dev`, which writes `.data/backups/cp-cp_dev-*.dump` plus `.json`.
- [ ] Check that `grep -rn "sp-\|\"sp\"\|SP_" server/lib/backup server/lib/jobs/backup.ts scripts/backup.ts` is empty.

**Tests:** `pnpm lint && pnpm typecheck && pnpm test`, and `pnpm scripts:build` lists `backup.mjs`.

**Commit:** `feat: add database backups confined to cp/`

---

### Task 2: Restore drill (master 11.1 part 2; R11-4)

**Files:**
- Create: `server/lib/backup/restore-drill.ts`, `scripts/restore-drill.ts`.
- Modify: `scripts/build-scripts.ts`, `package.json`.
- Test: `tests/integration/backup/restore-drill.test.ts`.

**Steps:**
- [ ] Port SP's files. Use `DRILL_SUFFIX = "_restore_drill"` and the tmpdir prefix `cp-drill-`.
- [ ] Tests (SP's):
  - it restores the newest backup into `cp_test_restore_drill` and compares it with the **manifest**;
  - it drops the scratch database afterwards;
  - it refuses an underivable name;
  - it never touches the source database (row counts are unchanged);
  - a checksum mismatch fails.
- [ ] Run `pnpm restore-drill` locally after `pnpm backup`, and quote the output in the report.

**Tests:** `pnpm test:integration -- restore-drill`, then `pnpm test`.

**Commit:** `feat: add the restore drill`

---

### Task 3: `secrets:rotate`, `demo:remove`, `custom-code:off` (master 11.1 part 3; Phase 7, 8 and 9 deferrals; R11-3, R11-4)

**Files:**
- Create:
  - `server/modules/integrations/rotate.ts`;
  - `scripts/{secrets-rotate,demo-remove,custom-code-off}.ts`.
- Modify: `scripts/build-scripts.ts` and `package.json` (`secrets:rotate`, `demo:remove`, `custom-code:off`).
- Test:
  - `tests/integration/ops/secrets-rotate.test.ts`;
  - `tests/integration/scripts/custom-code-off.test.ts`;
  - a `demo:remove` case in `tests/integration/users/scripts.test.ts` (it exists).

**Steps:**
- [ ] Port `rotate.ts`. It re-encrypts every `INTEGRATIONS[key].secrets` field with AAD `<key>.<field>`, plus the 2FA secrets. It deletes every session, writes the audit row `secrets.rotated`, and is idempotent.
- [ ] Add the named case "re-encrypts `integrations.ai.apiKey`" (Phase 9), and assert that an AI key saved under the old secret decrypts under the new one.
- [ ] Port `secrets-rotate.ts`. The old secret comes from `--from-secret` or `OLD_BETTER_AUTH_SECRET`, and neither value is ever printed. Add a test that captures `console.*` during a rotation and asserts that neither secret appears.
- [ ] Port `demo-remove.ts`. It deletes `@demo.local` users under the owners lock, and refuses when no real active owner would remain (test both).
- [ ] Port `custom-code-off.ts`. It switches `settings.customCode` off (draft and published), audits as SP does, and its test passes. Its name matches the help text that already cites `pnpm custom-code:off` (`git grep -n "custom-code:off"`).

**Tests:** `pnpm test:integration -- ops scripts users`, then `pnpm test`.

**Commit:** `feat: add secret rotation, demo removal and the custom code kill switch`

---

### Task 4: `db:sync`, `r2:bootstrap`, `data:export-to-r2`, `data:import`, entrypoint (master 11.1 part 4; Phase 6 deferrals; R11-2, R11-3, R11-4)

**Files:**
- Create:
  - `server/lib/{db-sync,r2-bootstrap,data-export,data-import}.ts`;
  - `scripts/{db-sync,r2-bootstrap,data-export-to-r2,data-import}.ts`.
- Modify:
  - `server/lib/r2-client.ts`: the CopySource bucket check, and `cpPrefixGuard` gets the bucket;
  - `docker-entrypoint.sh`: import when `CP_IMPORT_KEY` is new, then migrate again; `seed --if-empty`; `r2-bootstrap`; the marker comment rewritten;
  - `docker-compose.yml`: the 11.1 markers removed; "folder, default cp" becomes "optional sub-folder under cp/, default none";
  - `Dockerfile`: the comment listing the entrypoint scripts;
  - `scripts/build-scripts.ts` and `package.json` (`db:sync`, `r2:bootstrap`, `data:import`, `data:export-to-r2`);
  - `tests/unit/storage/aws-sdk-allowlist.test.ts`: `data-export.ts`, and `data-import.ts` if it imports the SDK.
- Test:
  - `tests/integration/ops/{db-sync,r2-bootstrap,data-export,data-import}.test.ts`;
  - `tests/unit/storage/r2-prefix.test.ts` (the CopySource cases).

**Steps:**
- [ ] CopySource bucket check first, test-first (R11-2 cases). Run the existing storage, media and migrate-media tests; they stay green.
- [ ] Port `db-sync` with the R11-4 guards. Its tests use `cp_test` and `cp_test_sync_*` scratch databases. Its tmpdir prefix is `cp-sync-`.
- [ ] Port `r2-bootstrap` with `CP_R2_*`, `DEFAULT_R2_PREFIX = ""` and the R11-2 prefix cases. It never overwrites a saved `integrations.r2` and never fails the start.
- [ ] Port `data-export`/`data-import` with the key `r2ObjectKey(cfg, "bootstrap/<stamp>.dump")`. `CP_IMPORT_KEY` is validated against that form. The marker is `ops.data-import`; confirm that `server/modules/settings/repo` stores it without a schema entry, as in SP. The tmpdir prefixes are `cp-export-` and `cp-import-`.
- [ ] Rewrite the entrypoint after SP's. Run `docker build -t cp:t4 .`, then run it against the dev Postgres. Use a scratch database (`cp_t4`) created and later dropped by hand, never `cp_dev`. Run it with only the three variables. Check that the logs show migrate, then `[import] CP_IMPORT_KEY not set`, then the seed line, then `CP_R2_* not set: R2 settings unchanged`, and that health returns 200.
- [ ] Check that `git grep -n -E "SP_R2|SP_IMPORT|sp/bootstrap|default sp|security-partners-db" -- ':!docs/superpowers'` is empty.

**Tests:** `pnpm test`, and `pnpm scripts:build` lists all eight new `.mjs` entries.

**Commit:** `feat: add db sync, r2 bootstrap and data import/export`

---

### Task 5: Security pass (master 11.2; R11-5, R11-6)

**Files:**
- Create:
  - `scripts/check-log-secrets.ts`;
  - `tests/unit/{check-log-secrets,ip-hash,like,api-client}.test.ts`;
  - `tests/integration/security/{cross-origin,no-secrets-in-logs}.test.ts`.
- Modify:
  - `tests/unit/ip.test.ts` (R11-6 cases);
  - `tests/unit/next-config-headers.test.ts` (no-CSP pin);
  - a new `tests/unit/auth-ip-config.test.ts` (reads `server/auth/auth.ts` source: `ipAddressHeaders` as R11-6, no `trustedProxies`);
  - `tests/integration/leads/*` (the two parity pins, if missing).

**Steps:**
- [ ] Port `cross-origin.test.ts`. Every mutating `/api/v1/admin/*` route mounted on `app.routes` refuses a cross-site `Origin` / `Sec-Fetch-Site` with 403, and the public leads route follows SP's rule. CP adds builder-pages, testimonials and AI routes; the sweep must find them through `app.routes`, not a list.
- [ ] Port `no-secrets-in-logs.test.ts` with CP sentinels.
- [ ] Port `check-log-secrets.ts` and its unit test. It reads the known secrets from `tests/e2e/env.ts` `SERVER_ENV`, `tests/e2e/fixtures.ts` and `tests/visual/admin-user.ts`.
- [ ] Port `ip-hash`, `like` and `api-client` unit tests. `like.test.ts` fails on any local LIKE escaper outside `server/db/like.ts`; fix any it finds.
- [ ] Write the R11-6 pins: the ip cases, the auth config, no CSP, 422s count toward `LEAD_RATE_LIMIT`, and a siteverify outage → 422 with nothing stored.
- [ ] Run `pnpm audit:deps` and record the output. If it reports a high or critical advisory in a production dependency, stop and report; don't add or bump dependencies.

**Tests:** `pnpm test`.

**Commit:** `test: add the security pass`

---

### Task 6: E2E ports and test-strength minors (master 11.3 part 1; R11-8; sweep rows)

**Files:**
- Create:
  - `tests/e2e/{roles,password-reset,security-headers,lottie-logo}.spec.ts`;
  - `tests/unit/{e2e-coverage,visual-guard,lottie-logo}.test.ts`;
  - `tests/unit/site-error.test.tsx`.
- Modify:
  - `tests/visual/builder-copy.spec.ts`: darwin guard line only;
  - `tests/e2e/lead-cleanup.ts`: page until empty;
  - `tests/e2e/leads.spec.ts`: the attribution DTO check, the referer-strip and escaped-markup asserts;
  - `tests/e2e/ai-setup.spec.ts`: discard the home draft in `finally`;
  - the 0024 migration test: per-field `error` keys;
  - the `banner-preview-style` test: match the named tokens only;
  - the contact template editor-meta: the consent error help text;
  - the `D5.x` comments in the four files the sweep names.

**Steps:**
- [ ] Port `roles.spec.ts`. It derives from `visibleNav`/`dockLinks` and `hasPermission`, so CP's nav (Blog, Collections ▸ Testimonials, Appearance, Design, AI assistant, custom pages) is covered by construction. Add the Appearance, Design, AI and builder rows SP has.
- [ ] Port the other three specs with CP copy. `lottie-logo` clears the setting in `finally`.
- [ ] Write `e2e-coverage.test.ts` with R11-8's rows, using the real titles.
- [ ] Do the sweep's test-strength fixes. The editor-meta help text is under `templates/`, so run `pnpm test:visual` (48/48) before committing.
- [ ] Check that `git grep -n "D5\." -- server tests` is empty.

**Tests:** `pnpm test`, `pnpm test:e2e`, `pnpm test:visual`.

**Commit:** `test: port the remaining e2e specs and close parked test gaps`

---

### Task 7: Admin accessibility gate (master 11.3 part 2; Phase 6, 8, 9 and 10 deferrals; R11-8)

**Files:** `tests/e2e/admin-a11y.spec.ts`, `tests/e2e/media-pins.ts`.

**Steps:**
- [ ] Port `media-pins.ts` with CP fixtures (`freezeUploads`, `pinMedia`, `MEDIA_ITEMS`, `PNG_1PX`).
- [ ] Port `admin-a11y.spec.ts`. Use tags `wcag2a/aa`, `wcag21a/aa` and `wcag22aa`, with `ALLOW` empty. Cover:
  - every CP admin screen in light and dark with its open overlays;
  - the R11-8 URLs;
  - the sticky-bar focus (SC 2.4.11) and sheet focus-trap checks.
- [ ] Fix a real violation in the admin component, and run the admin DOM tests again. Never add to `ALLOW` without a reason line, and stop and report if a fix would touch a public component.

**Tests:** `pnpm test:e2e`, `pnpm test`.

**Commit:** `test: add the admin accessibility gate`

---

### Task 8: Admin visual baselines A: shell, content, people (master 11.3 part 3; Phase 10 deferral; R11-7)

**Files:**
- `tests/visual/admin-shell.spec.ts`;
- `tests/visual/admin-screens.spec.ts` (created here; `shot()`, pins, masks);
- `tests/visual/seed.ts` (a published custom page row, if needed);
- new PNGs.

**Screens:**
- the shell (desktop, collapsed, mobile, nav-mobile);
- sign-in, dashboard, command palette, nav sheet, forbidden, not found, impersonation;
- pages (with a custom row), page editor, page builder;
- services, service editor;
- articles, review queue, new article, article author, review, scheduled, schedule dialog, featured;
- team, team record sheet, testimonials, testimonial record sheet (CP);
- settings site, settings contact preview;
- users, user detail, audit, audit detail sheet;
- account profile, security, sessions.

**Steps:**
- [ ] Port SP's specs for these screens only, with CP data and names.
- [ ] Run `pnpm exec playwright test tests/visual/admin-shell.spec.ts --update-snapshots=missing`, then the same for `tests/visual/admin-screens.spec.ts`.
- [ ] Open every new PNG: check for CP branding and the CP admin preset (no green), no unmasked time, no broken image.
- [ ] Run `pnpm test:visual` twice, all green.
- [ ] Check that `git diff --name-status 1f93507 -- tests/visual/__screenshots__` shows only `A admin-*`.

**Commit:** `test: add admin shell and content screen baselines`

---

### Task 9: Admin visual baselines B: media, integrations, leads (master 11.3 part 4; Phase 6 and 7 deferrals; R11-7)

**Files:** `tests/visual/admin-screens.spec.ts` (appended), `tests/visual/seed.ts` (leads rows, if needed), new PNGs.

**Screens:**
- media grid, list, details, upload, picker upload, delete 409;
- integrations overview, SMTP, SMTP failed, Turnstile (CP), R2, R2 with the move panel;
- leads board, leads table, drawer, details, activity, notes, delete dialog, CSV export dialog (CP).

**Steps:** As in Task 8, with `--update-snapshots=missing` on `admin-screens.spec.ts`. Task 8's files must still match, so a mismatch fails here instead of being rewritten. Then `pnpm test:visual` twice, and check the `A`-only diff.

**Commit:** `test: add media, integrations and leads baselines`

---

### Task 10: Admin visual baselines C: SEO, marketing, theme, AI, consent banner (master 11.3 part 5; Phase 8 and 9 deferrals; R11-7)

**Files:** `tests/visual/admin-screens.spec.ts` (appended), `tests/visual/consent-banner.spec.ts`, new PNGs.

**Screens:**
- SEO overview, sheet, defaults;
- redirects (populated), redirect dialog, CSV import preview (CP);
- marketing tracking, consent, code, events (CP);
- Appearance (light and dark), Design;
- AI assistant empty, history and reply (via `ai-pins.ts`);
- consent banner, customise, manage button (public, banner on).

**Steps:**
- [ ] `consent-banner.spec.ts` switches tracking on for a fresh visitor, with no tag ids, and switches it off in `finally`. The 44 public baselines keep the banner hidden; check them in the same run.
- [ ] Then as in Task 8: `--update-snapshots=missing` per spec, look at every PNG, `pnpm test:visual` twice, and check the `A`-only diff.

**Commit:** `test: add seo, marketing, theme, assistant and consent baselines`

---

### Task 11: CI and deploy gating (master 11.4; Phase 1 and 7 deferrals; R11-9)

**Files:**
- `.github/workflows/ci.yml`: the `e2e` and `image` jobs; `--passWithNoTests` removed;
- `.github/workflows/deploy.yml`;
- `.github/dependabot.yml`;
- `tests/unit/workflows.test.ts`.

**Steps:**
- [ ] Port SP's `ci.yml` jobs with CP ports, databases and image tag `cp:ci`, and container name `cp`. Add the Mailpit-ran grep (R11-9).
- [ ] Port SP's `deploy.yml` with the CP values and the two R11-9 deltas. Keep the `on:` block exactly `push: branches: [main]` plus `workflow_dispatch` (`skip_ci`).
- [ ] `workflows.test.ts` (SP's cases, CP values) asserts:
  - CI runs every job and command, with Postgres and Mailpit where needed;
  - deploy waits for `ci` and runs only for `refs/heads/main`;
  - `skip_ci` is dispatch-only;
  - no job has `branches` other than `main`;
  - least-privilege permissions, and SHA-pinned actions;
  - `ensure-env` names `kbL1xMktOKmL7i2YfGt-W`, `cleaning.raynx.ie` and `cleaning-partners-db`, and no `SP_`, `security` or `sp:` string;
  - `CP_R2_PREFIX` is never added;
  - dependabot covers `github-actions` and `npm`.
- [ ] Validate both workflow files locally with `actionlint` if it is installed; otherwise `node -e` YAML parse through the installed `yaml` package, or note the gap. Nothing is pushed, so CI doesn't run here. Say so in the report.
- [ ] Rehearse the `image` job steps locally: `docker build -t cp:ci .`, run it against a scratch database `cp_smoke` on the dev Postgres (`127.0.0.1:5434`) with only the three variables, then check readiness, the seed lines, loopback, `backup.mjs` and `restore-drill.mjs`. Drop `cp_smoke` afterwards, and quote the output.

**Tests:** `pnpm test`.

**Commit:** `ci: gate deploys on the full ci run`

---

### Task 12: Runbook, launch checklist, README, brief, Help guides, definition of done (master 11.5; R11-6, R11-10)

**Files:**
- `docs/runbook.md`, `docs/launch.md`, `README.md`, `docs/brief.md` (Changes only);
- `components/admin/help/help-view.tsx` (Guides card);
- `tests/unit/admin/help-guides.test.ts`, `tests/unit/docs.test.ts`.

**`docs/launch.md` "Owner must do", in this order:**
1. **Spec §10 step 1, Dokploy.**
   - Use the existing compose app (`kbL1xMktOKmL7i2YfGt-W`) for `cleaning.raynx.ie`, with Postgres 17. Recommended: the compose `db` service, where `POSTGRES_PASSWORD` is set once. The alternative is a separate Dokploy Postgres service on `dokploy-network`.
   - Set exactly `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL=https://cleaning.raynx.ie`. `BETTER_AUTH_SECRET` must be new (`openssl rand -base64 48`), never SP's; keep it in the password manager. `ensure-env` would generate the missing ones on the first gated deploy, and never changes an existing value.
   - Run exactly one app container.
   - Set the GitHub repo secrets `DOKPLOY_URL` and `DOKPLOY_API_KEY`, and optionally `CP_R2_*`. Optionally add required reviewers on the `production` environment.
2. **Proxy chain.** Confirm the R11-6 (a), (b) and (c) answers, and fix Traefik if they differ. Add the Traefik `rateLimit` middleware for `/og/*`, `/api/v1/admin/ai/*` and `/api/v1/admin/preview`.
3. **Cut-over.** Merge `feat/dynamic-platform` → `main`; that is the owner's call (B11). CI then runs, and deploy follows only on success. Check `docker logs` for the migrate and `[db:seed] empty database (no pages): content seeded` lines.
4. **Spec §10 step 2.** `node scripts/dist/admin-create.mjs` in the container, **once**, for the first owner, then turn on 2FA. Never run `seed.mjs --allow-production` on the live site.
5. **Spec §10 step 3, Settings ▸ Integrations.**
   - SMTP, then Test.
   - R2: same bucket as SP (O7); keys go under `cp/`. Use an API token with **Object Read & Write**; the bucket stays private. Then Test, then "Move uploads to R2".
   - Turnstile in **Invisible** mode, then Test.
   - AI (optional): the provider key and the allowed roles.
   - Settings ▸ Leads recipients (default `info@cleaningpartners.ie`) and retention (24 months).
6. **Spec §10 step 4.** Review the placeholder Privacy and Terms copy, and the service detail copy for the four services Figma did not cover. Until they are replaced, tick noindex in their SEO tab.
7. **SEO.**
   - Set `settings.site.productionUrl` to `https://cleaning.raynx.ie`, or the final domain. Until it is set, canonical, sitemap, JSON-LD and OG fall back to `BETTER_AUTH_URL`, and staging is indexable.
   - Robots noindex mode (`Disallow: /`) stops crawlers from seeing the noindex, so serve noindex before switching.
8. **Backups.**
   - The daily job writes to `cp/backups/` in R2 once R2 is saved, and to `/data/backups` before that. Retention is 14.
   - Take `node scripts/dist/backup.mjs` before any deploy that changes the database.
   - After a day, the dashboard shows no failing jobs and a backup exists. Run `restore-drill` once, then monthly.
   - Never add an R2 lifecycle rule that covers `cp/`.
9. **The rest.**
   - Marketing tracking: turn it on only when ready. Custom code is the owner's responsibility.
   - Invite staff with the right roles.
   - `demo:remove` if `demo:seed` ever ran on production.
   - Keep Traefik access-log retention short.

**`docs/launch.md` "Owner must confirm":**
- **The R11-6 proxy chain answers**, (a), (b) and (c).
- **A shared R2 bucket with SP** (O7). R2 tokens can't be limited to a prefix, so CP's token can technically reach `sp/`. The code's `cp/` guard is the protection. A separate bucket is the stronger option.
- **No bucket-wide lifecycle rule** removes `cp/backups/`.
- **Enquiry consent basis** (`consent: true` from the form's consent box).
- **Cloudflare as GDPR processor** (Turnstile, R2).
- **The AI provider as GDPR processor when "share enquiry details" is on** (Phase 9). Names, companies, messages and notes are sent, and addresses and Eircodes typed into messages are not redacted.
- **A Turnstile outage drops leads with a 422** (R11-6).
- **Brand contrast.** White on the frozen brand `#11b1d1` is 2.55:1, below WCAG 3:1 (large text) and 4.5:1. A deeper brand can be chosen in Appearance.
- **The Cookie-settings pill contrast.**
- **Optionally, Git LFS** for the visual PNGs.

**Steps:**
- [ ] Write the runbook from SP's with CP values and the R11-10 sections, and verify every command against `package.json` and `scripts/build-scripts.ts`.
- [ ] Write the launch doc as above, the README, and the brief Changes.
- [ ] Add the Guides card: `HELP_GUIDES` lists runbook headings, rendered under the existing Help topics. Add `help-guides.test.ts`, and update the existing help DOM test if it counts cards.
- [ ] Add `docs.test.ts`.
- [ ] **Definition of done**, with the output captured in the report:
  - the Phase gate below;
  - `pnpm scripts:build`;
  - the Task 11 image rehearsal re-run on the final tree;
  - `pnpm backup && pnpm restore-drill` on `cp_dev`;
  - the branding scan `git grep -n -i -E "security partners|securitypartnersltd|security\.raynx|SP_R2|SP_IMPORT|\bsp_(dev|test|e2e)\b" -- ':!docs/superpowers' ':!pnpm-lock.yaml'`, where only the group-companies fixture and test allowlist hits remain;
  - spec §2 goals 1–4 and §4 anti-goals, each ticked with the test or command that proves it.

**Tests:** `pnpm test`.

**Commit:** `docs: add the cp runbook, launch checklist and readme`

---

## Deferral map (self-review)

| Master item | Task |
|---|---|
| 11.1 `backup` | 1 |
| 11.1 `restore-drill` | 2 |
| 11.1 `secrets:rotate` (incl. `rotate.ts`, the AI key) | 3 |
| 11.1 `db:sync` | 4 |
| 11.1 `custom-code:off` | 3 |
| 11.1 `r2:bootstrap` (`CP_R2_*`) | 4 |
| 11.1 `data:import`, `data:export-to-r2` | 4 |
| 11.1 R2 prefix tests (Review Focus 2): driver keys, ListObjectsV2 Prefix, pruning only under `cp/backups/`, CopySource bucket | 1, 4 (R11-2) |
| 11.2 same-origin, headers, log secret scan, dependency audit | 5 (headers already pinned; the e2e headers spec in 6) |
| 11.2 launch decisions: clientIp/XFF, null IP, 422 retries, Turnstile outage, proxy cost, CSP | 5 (R11-6), 12 (docs) |
| 11.3 SP e2e specs ported for CP | 6, 7 |
| 11.3 admin screens re-shot | 8, 9, 10 |
| 11.4 `deploy.yml` on CI success for `main`, dormant until the owner merges | 11 (R11-9) |
| 11.4 CI `image` smoke (Phase 1) and Mailpit e2e (Phase 7) | 11 |
| 11.5 `docs/{brief,runbook,launch}.md`; spec §10 owner steps in order; definition of done captured | 12 |
| 11.5 Help "Guides" card (Phase 4) | 12 |
| 11.5 runbook "Custom code and CSP", "Verify domains by DNS", "AI assistant", "Page builder"; `productionUrl`; noindex | 12 |
| 11.x parked minors | sweep table above (6, or won't fix) |
| Spec §4 anti-goal "writing outside the `cp/` R2 prefix" | 1, 4 (R11-2) |
| Spec §4 anti-goal "a copied `BETTER_AUTH_SECRET`" | 12 (launch step 1), 11 (`ensure-env` generates a new one) |
| Spec B11 no half-built admin public; cut-over is the owner's | Global constraints, 11, 12 |

## Phase gate

```bash
pnpm db:up            # Postgres on 127.0.0.1:5434, Mailpit on 1026/8026
pnpm lint && pnpm typecheck && pnpm test \
  && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build \
  && pnpm test:visual && pnpm test:e2e && pnpm audit:deps && pnpm scripts:build
pnpm backup && pnpm restore-drill
```

Also confirm against the phase base `1f93507`:
- **Markers.** `git grep -n -E "11\.[0-9x]\b|Task 11|Phase 11|not active yet|passWithNoTests" -- ':!docs' ':!pnpm-lock.yaml'` finds nothing. List and justify any hit.
- **No new todos.** `git grep -n "it.todo" -- tests` is empty.
- **Baselines.** `git diff --name-status 1f93507 -- tests/visual/__screenshots__` has only `A` lines, each matching `admin-*` or `consent-*`. The 48 existing PNGs show no `M` or `D`.
- **No env, deps, migration or visual-contract change.** `git diff 1f93507 -- server/env.ts pnpm-lock.yaml server/db/migrations playwright.config.ts tests/visual/urls.ts tests/visual/public-pages.spec.ts tests/visual/builder-pages.spec.ts docs/brief-inventory.json components/home components/about components/services components/contact components/blog` is empty. `git diff 1f93507 -- package.json` touches only `"scripts"`.
- **Allowlist entries.** `git diff 1f93507 -- tests/unit/storage/aws-sdk-allowlist.test.ts` adds only the R11-2 files, and each one's key lines are quoted in its task report.
- **Deploy trigger.** `git diff 1f93507 -- .github/workflows/deploy.yml` keeps `on:` as `push: branches: [main]` plus `workflow_dispatch`.
- **Nothing pushed.** `git log origin/feat/dynamic-platform..HEAD` (or `git status -sb`) shows the branch still ahead and nothing pushed. `main` is untouched: `git rev-parse main` is the same before and after the phase.
- **No SP leftovers in this phase's files.** `git grep -n -E "SP_R2|SP_IMPORT|sp-ops|\"sp-|sp/backups|security\.raynx|security-partners-db|NTWy3Bk2X7d8g25YMsbn2" -- ':!docs/superpowers'` is empty.
- **The report states:**
  - the named SP differences: the R2 key layout (R11-2), the optional R2 inputs in `ensure-env` and no `CP_R2_PREFIX` (R11-9), and the CP-only baselines (R11-7);
  - each R11-6 ruling;
  - the Mailpit-in-CI outcome.

  Cut-over waits for the owner (B11).

## Self-review: plan conflicts found and resolved

1. **File name.** The master's rolling-wave list names `phase-11-launch.md`. The controller asked for `phase-11-hardening.md`, so that is the name used here. The controller records the rename in the master Changes at phase end.
2. **"No new env vars, ever" vs master 11.1 `r2:bootstrap (CP_R2_*)`.** These are resolved as input-only operator variables, as in SP's own phase (`OLD_BETTER_AUTH_SECRET`, `DEMO_PASSWORD`). `server/env.ts` is unchanged, and the app never reads them (R11-3).
3. **SP's R2 layout vs CP's guard.** SP builds `<keyPrefix>/backups/` with `keyPrefix` defaulting to `sp`. Under CP's `r2ObjectKey` that would give `cp/sp/backups/`, and `CP_R2_PREFIX=cp` would give `cp/cp/`. Resolved: CP builds every key with `r2ObjectKey`, the default sub-folder is `""`, and `ensure-env` never adds `CP_R2_PREFIX` (R11-2, R11-9).
4. **SP's `ensure-env` requires the R2 repo secrets; spec §10 makes R2 a Settings step.** Resolved: CP adds `CP_R2_*` only when they are set (a named difference). It also only adds keys, which agrees with the owner setting the three variables by hand.
5. **"Only new baselines" vs `--update-snapshots` on a spec that grows over three tasks.** Resolved with `--update-snapshots=missing` on the named new spec, so Task 8's files are compared, not rewritten, in Tasks 9–10. Help is left out because Task 12 changes it.
6. **Master 11.2 "SP's security tests: … headers".** Headers are already ported and pinned (`next-config-headers.test.ts`), so 11.2 adds only the e2e headers spec (Task 6) and the no-CSP pin.
7. **SP Tasks 5, 7, 8 and 9** (input, crypto and env guards, users hardening, LIKE helper, admin findings) are already in CP's tree through the final-state ports. They are not re-planned; only the missing tests (`like`, `ip-hash`, `api-client`, `site-error`) are added.
8. **Spec §10 "create the Dokploy compose app + Postgres".** The CP compose app already exists (its id is in `deploy.yml`), and `docker-compose.yml` already ships a `db` service. The launch doc recommends that service and gives a separate Dokploy Postgres as the alternative.
9. **Master Phase 7 "decide" items.** The rule here is SP parity (O3) with tests and docs, not new behaviour. Each decision is listed in Known limitations and, where it affects data, in "Owner must confirm".
10. **`builder-copy.spec.ts` is in the frozen visual set.** It gains only the darwin guard, which `visual-guard.test.ts` requires. It writes no baseline, so R11-11 allows that one line.
