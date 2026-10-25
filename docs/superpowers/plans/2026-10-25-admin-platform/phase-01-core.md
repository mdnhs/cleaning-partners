# Phase 1: Platform core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 1.1–1.5). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md`. Branch `feat/dynamic-platform`. Never push.

**Goal:** Bring SP's infrastructure layer into CP so that this phase ends green:
- deps, tooling and boundaries;
- env, crypto and errors;
- Postgres with SP's full schema and migrations;
- a Hono API with health checks;
- a Docker image that migrates on start, and CI.

The public site is untouched and stays at 0 px.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only.
- **Port the final-state files at that commit**, not the snippets in SP's phase plans. Those snippets evolved later.
- Use `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-01-infra.md` in SP for order and rationale. It maps as follows:

  | This task | SP phase-01 |
  |---|---|
  | 1.1 | T1 |
  | 1.2 | T2 + T3 |
  | 1.3 | T4 |
  | 1.4 | T5 |
  | 1.5 | T6 |

- Its "Corrections to master plan" and "How `server-only` is handled outside Next" sections apply here too.

## Global constraints for this phase

- The master plan's Global Constraints apply in full. In particular:
  - the **branding map**;
  - dev ports **5433** (Postgres), **1026/8026** (Mailpit) and **3200** (Playwright);
  - the three env vars only;
  - `next build` with no env and no DB;
  - `import "server-only"` first in every `server/**` file;
  - `lib/**` never imports `server/**`.
- Nothing under `app/(site)` or `components/` changes, except that pages may move into `app/(site)/` only in Phase 3, not here. `pnpm test:visual` must stay 40/40 at 0 px after Task 1.5.
- Keep `playwright.config.ts` `use.channel: "chromium"`, the `webServer` command from Phase 0, and the screenshot names unchanged (master Changes, 2026-10-25).
- **Risk (Task 1.5):** `next/font/google` fetches Barlow and Roboto at build time. A cold-cache Turbopack build already failed once in Phase 0 ("queries have exactly one entry"). Docker and CI builds are always cold. If the image or CI build fails there, report it with the exact error. Do not switch fonts or bundlers to work around it, because that would move pixels. The controller will rule.
- **Transitive-port rule:** a ported file may import SP modules this task does not list.
  - Port such a module too if it is pure (`lib/**`, no `server/**`, no React components).
  - Otherwise follow the rulings below. Never invent replacements.
  - List every extra file you port in the report.
- Commits are conventional and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase (the master defers these to the phase plan)

- **R1.** Task 1.1 installs **every** SP dependency at SP's exact version, per the master's Tech Stack. SP's "install per phase" correction is superseded: CP ports a finished system. Use `pnpm add --save-exact`. Keep `name: "cleaning-partners"`, and keep CP's existing `@base-ui/react` etc., re-pinned to SP's exact versions.
- **R2.** `server/db/schema/builder-pages.ts` type-imports `DraftDocument` from `@/blocks/document`, which imports SP's block registry and SP public components. In Phase 1, type that column `.$type<unknown>()` with the comment `// Phase 10 (Task 10.2) restores DraftDocument from @/blocks/document`. This is TS-only; the SQL is identical. Every table must be present in the Drizzle schema, or a later `db:generate` would emit DROPs.
- **R3.** `lib/schemas/content/{service,article}.ts`, `lib/schemas/common.ts`, `lib/leads/attribution.ts` (+ `lib/analytics/{events,consent}.ts`), `lib/seo/redirects.ts`, `lib/media.ts` and `lib/ids.ts` are pure, so port them as-is when the schema needs them. Task 3.1 replaces `content/service.ts` with CP's service shape.
- **R4.** Aggregator files are ported **with only the members that exist so far**. Later tasks add members until each file equals SP's (rebranded). The aggregators:
  - `server/api/app.ts`: health only, plus the app-level middleware;
  - `docker-entrypoint.sh`: migrate only;
  - `.github/workflows/ci.yml`: the `static`, `integration` and `build` jobs (no `e2e` until Phase 2);
  - `next.config.ts`: SP's `SECURITY_HEADERS` and `headers()`, `output: "standalone"`, `poweredByHeader: false`. **Not** `ADMIN_LEGACY_REDIRECTS` (never in CP), `htmlLimitedBots` (Task 8.1), `cacheComponents` (Task 3.5), `outputFileTracingIncludes` (Task 8.1) or `experimental.authInterrupts` (Task 2.3).
- **R5.** `instrumentation.ts` is not created in Phase 1. Task 5.4 creates it with the scheduler. `server/lib/shutdown.ts` comes with it.
- **R6.** `server/api/middleware/auth.ts` waits for Task 2.3. It needs Better Auth.
- **R7.** In CI, the Postgres service keeps container port 5432 but maps the host port to **5433** (`ports: ["5433:5432"]`), and Mailpit maps `1026:1025`, `8026:8025`. Test code then needs no env differences. Database names and roles are `cp`/`cp_*`.

---

### Task 1: Deps, tooling, boundaries, branding gate (master 1.1)

**Files:**
- Modify: `package.json` (all SP deps at exact versions; all SP scripts except those whose files arrive later, which are added by the task that adds the file). Keep `test:visual*`.
- Modify: `pnpm-workspace.yaml` (SP's `allowBuilds`)
- Modify: `tsconfig.json` (target ES2022, exclude `scripts/dist` and `.claude`)
- Modify: `eslint.config.mjs` (SP's, including the boundary rules)
- Modify: `.gitignore` (append SP's extra entries: `/.vitest/`, `.env.development`, `scripts/dist/`)
- Create: `vitest.config.ts` (SP's: projects `unit`, `dom` and `integration`; the integration project matches nothing until Task 3)
- Create: `tests/stubs/server-only.ts`, `tests/unit/setup.ts`, `tests/dom/setup.ts`, `scripts/register-server-only.mjs`
- Create: `docs/superpowers/notes/nextjs-16-api.md`, `docs/superpowers/notes/libraries-api.md` (copied verbatim, with a one-line header "Copied from SP at 1a9f65d")
- Test: `tests/unit/lint-boundaries.test.ts`, `tests/unit/server-only-guard.test.ts` (ported), `tests/unit/branding.test.ts` (new)

**Interfaces:**
- Produces:
  - scripts `test`, `test:unit`, `test:integration`, `test:watch`, `typecheck`, `lint`, `tsx:server`;
  - the `server-only` handling for Vitest, tsx and drizzle;
  - the branding gate.

**Steps:**

- [ ] **Step 1: Install deps.** For each `dependencies` and `devDependencies` entry in SP's `package.json`, run `pnpm add [-D] --save-exact <pkg>@<SP version>`. Then set `pnpm-workspace.yaml` to SP's and run `pnpm install`.

  Expected: no "ignored build scripts" warning for esbuild or sharp. `pnpm ls next react` prints 16.3.8 and 19.3.0.

- [ ] **Step 2: Port the tooling files** listed above, rebranded. Add scripts with `pnpm pkg set`: `test`, `test:unit`, `test:integration`, `test:watch` and `tsx:server`, using SP's command text.

- [ ] **Step 3: Write the branding test (failing first)**

  `tests/unit/branding.test.ts` gets the file list from `git ls-files` (via `execFileSync`). It keeps text files only: it skips binaries by extension (png, jpg, jpeg, webp, avif, ico, svg, woff, woff2, lottie, json under `tests/fixtures`) and skips `pnpm-lock.yaml`. It then asserts that there are no hits for these forbidden patterns:

  ```ts
  const FORBIDDEN = [
    /securitypartnersltd\.com/i,
    /security\.raynx\.ie/i,
    /security-partners/i,
    /\bsp_(dev|test|e2e)\b/,
    /cookiePrefix:\s*["']sp["']/,
    /["']sp\/v1["']/,
    /\bSP_R2_/,
    /\bSP_ADMIN\b/,
    /sp-admin/,
    /Security Partners/,
  ]
  // Whole files that may cite SP (the reference repo, or the sister company as content).
  const FILE_ALLOW = [/^docs\/superpowers\//, /^docs\/brief(-inventory\.json|\.md)$/, /^tests\/unit\/branding\.test\.ts$/]
  // Lines where "Security Partners" is CP content (group companies, team bio).
  const LINE_ALLOW = [/sister company to Security Partners/, /name:\s*"Security Partners"/, /securitypartnersltd\.ie/]
  ```

  A hit on a line matching `LINE_ALLOW` passes **only** for `/Security Partners/` and the `.ie` domain. The failure message lists `file:line: text` for every hit.

  Add a second test that runs the same matcher on an inline fixture string containing `https://securitypartnersltd.com` and expects one hit. This proves the matcher works.

- [ ] **Step 4: Run tests**

  Run: `pnpm test:unit`

  Expected: `branding`, `lint-boundaries` and `server-only-guard` pass. The guard passes vacuously because there is no `server/` yet. If branding finds hits in files the task created, fix those files; never widen the allowlist.

- [ ] **Step 5: Verify the tree**

  Run: `pnpm lint && pnpm typecheck && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build`

  Expected: green.

- [ ] **Step 6: Commit**: `chore: add platform deps, test tooling, boundaries and branding gate`

---

### Task 2: Env, errors, crypto, actor, ids, site env and origin (master 1.2)

**Files:**
- Create (port):
  - `server/env.ts`
  - `server/lib/{errors,crypto,actor,site-env,site-origin,ip,internal-signature}.ts`
  - `lib/auth/roles.ts` (`Actor.roles` needs it; Task 2.1 adds `permissions.ts` and must not change this file)
  - `lib/{ids,json,format,interpolate,hidden-chars,href,link-rules,request-path,utils}.ts`, merging SP's `utils.ts` into CP's existing one: keep CP's `cn`, add SP's exports
  - `lib/seo/urls.ts` if `site-origin` needs it
  - `.env.example` (SP's, rebranded: `postgres://cp:cp@127.0.0.1:5433/cp_dev`, `BETTER_AUTH_URL=http://localhost:3000`, SP's example secret)
- Test (port): the SP unit tests for each file: `env`, `errors`, `crypto`, `ids`, `json`, `format`, `format-dublin`, `interpolate`, `hidden-chars`, `link-rules`, `ip`, `internal-signature`, `post-dates` if `format` needs it.

**Interfaces:** SP's, verbatim: `getEnv()`, `parseEnv()`, `AppError`, `fieldErrorsFromIssues()`, `deriveKey()`, `encryptSecret()`, `decryptSecret()`, `secretHint()`, `Actor`, `getSiteEnv()`, `siteOrigin()`, `hashIp()`, `clientIp()`.

**Steps:**

- [ ] **Step 1:** Port the tests first and run `pnpm test:unit`. Expected: FAIL, because the modules are missing.
- [ ] **Step 2:** Port the modules. In `crypto.ts`, set `SALT = "cp/v1"` and update its doc comment.
- [ ] **Step 3:** Add to `tests/unit/crypto.test.ts`:

  ```ts
  it("does not decrypt a token sealed under SP's salt", () => {
    // HKDF salt is part of CP's isolation from SP (spec §4): same secret, different salt → no decrypt.
    const secret = "x".repeat(32)
    const spKey = hkdfSync("sha256", secret, "sp/v1", "secrets", 32)
    const token = sealWithKey(Buffer.from(spKey), "hello", "aad") // helper in the test, AES-256-GCM as crypto.ts
    expect(() => decryptSecret(token, "aad", secret)).toThrow()
  })
  ```

  `sealWithKey` is a local test helper. It reproduces `encryptSecret`'s token format (`v1:<iv>:<ct>:<tag>`, base64url) with a given key.

- [ ] **Step 4:** Run `pnpm test:unit`. Expected: all ported tests and the new test pass, and branding passes.
- [ ] **Step 5:** Commit: `feat: add env validation, errors, crypto and request helpers`

---

### Task 3: Database, migrations, dev services (master 1.3)

**Files:**
- Create (port):
  - `docker-compose.dev.yml`: project `cleaning-partners-dev`; `postgres:17.11` with user/password `cp`, db `cp_dev`, ports `127.0.0.1:5433:5432`; Mailpit `127.0.0.1:1026:1025`, `127.0.0.1:8026:8025`; healthcheck `-U cp -d cp_dev`
  - `docker/postgres-init.sql` (`cp_test`, `cp_e2e`)
  - `drizzle.config.ts`
  - `server/db/{client,migrate,like}.ts`
  - `server/db/schema/**` (every SP schema file, R2 for builder-pages)
  - `server/db/migrations/0000_init.sql` … `0020_remove_newsletter.sql` and `meta/**`, **verbatim**. Do not rebrand SQL comments if that would change checksums; check with SP's migrator whether it hashes files.
  - `scripts/migrate.ts`
  - `tests/integration/{db,setup,global-setup}.ts`
  - pure `lib/**` type dependencies per R3
- Modify: `package.json` scripts `db:up`, `db:down`, `db:generate`, `db:migrate` (SP's text)
- Test (port): `tests/unit/{db-client,migrate-unlock,pg-errors}.test.ts`, `tests/integration/db/*.test.ts` (whatever exists in SP for the client and migrations)
- Create: `.env.development` locally from `.env.example` (gitignored, never committed)

**Interfaces:**
- SP's: `getDb()`, `closeDb()`, `pingDb()`, `Db`, `DbOrTx`, `runMigrations(url)`, `resetDb()` (tests).
- Test DB URL default: `postgres://cp:cp@127.0.0.1:5433/cp_test`, overridable by `TEST_DATABASE_URL`.
- E2E DB URL: `cp_e2e`.

**Steps:**

- [ ] **Step 1:** Port the unit tests and the integration harness. Run `pnpm test:integration`. Expected: FAIL (no DB or modules).
- [ ] **Step 2:** Port the compose and init files. Run `pnpm db:up`.

  Expected: healthy. Check with `docker compose -f docker-compose.dev.yml ps`. If SP's stack is running, both stacks must be up at once (`docker ps` shows both postgres containers).

- [ ] **Step 3:** Port the client, migrator, schema (R2) and the migrations verbatim.
- [ ] **Step 4:** Run `pnpm db:migrate`.

  Expected: 21 migrations applied to `cp_dev`. Then `psql postgres://cp:cp@127.0.0.1:5433/cp_dev -c '\dt'` lists SP's tables, including `builder_pages` and `rate_limits`, with no newsletter table.

- [ ] **Step 5:** Run `pnpm db:generate`.

  Expected: "No schema changes, nothing to migrate". This proves the Drizzle schema matches the migrations. If it wants to emit a migration, the port is wrong; fix the schema, never the migrations.

- [ ] **Step 6:** Run `pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build`. Expected: unit and integration green, and the build passes with no env.
- [ ] **Step 7:** Commit: `feat: add postgres schema, migrations and dev services`

---

### Task 4: Hono skeleton and health (master 1.4)

**Files:**
- Create (port):
  - `app/api/[...route]/route.ts`
  - `server/api/{app,context,validate}.ts` (app.ts per R4)
  - `server/api/middleware/{error,request-id,same-origin,body-limit,rate-limit}.ts` (not `auth.ts`, R6)
  - `server/modules/health/routes.ts`
  - `server/lib/{rate-limit,pg-errors}.ts`
  - `server/modules/rate-limit/repo.ts`
  - `lib/security-headers.ts`
  - `lib/schemas/api/{list,media}.ts` if `body-limit` needs `MAX_UPLOAD_BYTES`
- Test (port): `tests/unit/api/*` and `tests/integration/api/health*.test.ts` from SP that cover these files. Drop any test case that exercises routes not yet mounted; list the dropped cases in the report for Task 11.3 to restore.

**Interfaces:**
- SP's `app` (basePath `/api`), `AppEnv`, `zv()`, and `adminRoutes`/`AdminApi`, which are empty for now (R4).
- `X-Robots-Tag: noindex` on every `/api/*` response.

**Steps:**

- [ ] **Step 1:** Port the tests. Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files.
- [ ] **Step 3:** Run `pnpm test`. Expected:
  - `GET /api/v1/health/live` → 200 `{status:"ok"}`;
  - `/api/v1/health` → 200 against the test DB and 503 `{status:"unavailable"}` against a closed port;
  - an unknown route → 404 envelope with `requestId`;
  - an unknown error → 500 `INTERNAL` with no stack;
  - `secureHeaders` and `X-Robots-Tag` present.
- [ ] **Step 4:** Manual check:
  1. `pnpm dev` (reads `.env.development`), then `curl -s localhost:3000/api/v1/health` returns `{"status":"ok",…}`.
  2. `curl -sI localhost:3000/` is 200 and `/` renders as before.
- [ ] **Step 5:** Commit: `feat: add hono api skeleton with health checks`

---

### Task 5: Docker, entrypoint, standalone, CI, headers (master 1.5)

**Files:**
- Modify:
  - `Dockerfile`: SP's, rebranded. Keep CP's header comment updated for cleaning.raynx.ie. Copy migrations and `scripts/dist`; install `postgresql17-client`; `ENTRYPOINT ["/app/docker-entrypoint.sh"]`, `CMD ["node","server.js"]`; healthcheck `/api/v1/health/live`.
  - `docker-compose.yml`: keep service `cleaning-web` and image `ghcr.io/mdnhs/cleaning-partners:latest`. Add SP's env block (three vars from Dokploy), the `/data` volume, and SP's Postgres 17 service with role/db `cp`. Match SP's structure.
  - `next.config.ts` (R4)
  - `package.json` script `scripts:build`
- Create (port): `docker-entrypoint.sh` (R4: migrate then `exec "$@"`), `scripts/build-scripts.ts`, `.github/workflows/ci.yml` (R4, R7)
- Note: `scripts/prepare-standalone.mjs` already exists from Phase 0, byte-identical to SP's. Keep it.
- Do not touch: `.github/workflows/deploy.yml` (Task 11.4)
- Test (port): `tests/unit/{next-config-headers,scripts-bundle}.test.ts`

**Steps:**

- [ ] **Step 1:** Port the two unit tests. Run them. Expected: FAIL.
- [ ] **Step 2:** Port the files.
- [ ] **Step 3:** Run `pnpm test`. Expected: green, including the header tests (security headers on pages, `DENY` + `frame-ancestors 'none'` on `/admin/*`).
- [ ] **Step 4: Container check**

  ```bash
  docker build -t cp-web:phase1 .
  docker run --rm -d --name cp-web-p1 -p 3300:3000 \
    -e DATABASE_URL=postgres://cp:cp@host.docker.internal:5433/cp_dev \
    -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" -e BETTER_AUTH_URL=http://localhost:3300 cp-web:phase1
  sleep 8; docker logs cp-web-p1 | tail -20; curl -s localhost:3300/api/v1/health/live; curl -sI localhost:3300/ | head -1
  docker rm -f cp-web-p1
  ```

  Expected:
  - the build succeeds with no build args;
  - the logs show migrations ran (no-op on an already-migrated `cp_dev`);
  - health returns `{"status":"ok"}`;
  - `/` returns 200.

- [ ] **Step 5: CI syntax**

  Run `actionlint .github/workflows/ci.yml` if installed. Otherwise run `pnpm dlx @action-validator/cli .github/workflows/ci.yml`. If neither runs offline, record that.

  Expected: no errors.
- [ ] **Step 6: Visual gate**

  Run: `pnpm test:visual`

  Expected: 40 passed at 0 px. The headers must not change rendering.
- [ ] **Step 7:** Commit: `build: add migrating docker entrypoint, standalone scripts and CI`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual
```

All green. Branding test included.
