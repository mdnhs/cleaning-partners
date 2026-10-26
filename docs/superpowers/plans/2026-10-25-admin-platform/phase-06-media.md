# Phase 6: Media

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 6.1–6.4). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (O7: R2 shares SP's bucket under key prefix `cp`; §4 anti-goal: never write outside `cp/`). Branch `feat/dynamic-platform`. Never push.

**Goal:** Give CP all of SP's media features:
- the R2 driver;
- the media library screen (grid/list, drag-and-drop upload with progress, details, alt/decorative/caption, focal point, replace, delete with in-use 409, usages);
- the migrate-uploads-to-R2 job.

Every object CP touches in the shared bucket must live under `cp/`. CP must never read, list, write or delete outside that prefix. The public site stays at 0 px.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only. Port the final-state files. Rationale: SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-06-media.md` Tasks 3–8. Integrations Tasks 1–2 belong to CP Task 7.1. Also see mk-parity `phase-D1` for media decorative/caption/missing-alt.

## Global constraints for this phase

- The master Global Constraints apply in full, including **Review Focus #2**.
- Public site at 0 px (visual 44/44).
- Closure rule as in the earlier phases.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R6-1 Hard `cp/` root.** `server/lib/r2-client.ts` `r2ObjectKey(config, key)` always returns `cp/` + (`config.keyPrefix` ? `${keyPrefix}/` : "") + `key`. SP's user-configurable `keyPrefix` becomes an optional sub-folder **under** `cp/`.
  - `R2_PREFIX = "cp/"` is exported as the master Shared contract says.
  - `keyPrefix` validation rejects anything that could escape: `..`, a leading `/` or `\`, backslashes, and empty segments.
  - No code builds an R2 key anywhere except through `r2ObjectKey`.
  - Every `ListObjectsV2` call passes `Prefix` built by `r2ObjectKey`, so it starts with `cp/`.
  - Tests (Review Focus #2):
    - every Put, Get, Head and Delete key the driver sends starts with `cp/`, using a mocked S3 client that records commands;
    - every List `Prefix` starts with `cp/`;
    - a hostile `keyPrefix` is rejected;
    - a grep-style unit test fails if `new PutObjectCommand`, `DeleteObjectCommand`, `ListObjectsV2Command`, `GetObjectCommand`, `HeadObjectCommand` or `CopyObjectCommand` appears in a file that does not route its `Key`/`Prefix` through `r2ObjectKey`.
- **R6-2 Restore SP signatures.** Restore `getStorage(db)` (R2 once `integrations.r2` is saved, else disk) and `storageFor(driver, db)` (null for static, or for R2 when R2 is gone), replacing Phase 4's stub.
  - Restore the media-service R2 and migrate pieces Phase 4 removed (`migrateDiskMediaToR2`, `startMediaMigration`, `getMediaMigrationStatus`, `readR2Settings`/`lockR2Settings`, `listDiskMediaBatch`).
  - Fix the Phase 4 traps:
    - the stale R2 comments;
    - `deleteStoredFile` throwing for R2 rows after commit (restore SP's null-safe path);
    - the job's "R2 is not configured" warning.
  - Restore everything else Phase 4 removed (Phase 5 final review I4):
    - the upload R2-settings race guard in `storePrepared`: `readR2Settings`, then `lockR2Settings` inside the transaction, then the `sameR2Settings` check, returning 409 "The storage settings changed during the upload";
    - `markMovedToR2`;
    - the `enqueueKeyedJob` import;
    - the `MediaMigrationStatus` wiring.

    Port SP's upload-during-disconnect test.
  - Define `R2_PREFIX` once, in `server/lib/r2-client.ts`. Re-export it from `server/lib/storage/r2.ts`, the master contract location, so backups (11.1) share it.
  - Restore the 2 R2 cases dropped from `media-manage-hardening` ("moves a disk file to R2 and retires the disk file"; "refuses (409) when R2 is disconnected mid-put").
  - Replace `r2-guard.test.ts` with a real "R2 saved → getStorage is r2" test.
- **R6-3 Configuring R2.** The Integrations screens arrive in Task 7.1. In this phase, R2 is configured in tests through the integrations service (already ported), not through the UI. Port `server/modules/integrations/routes.ts` only if SP's migrate route lives there. If so, mount it and leave the screens for 7.1.
- **R6-4 Decorative media** (Phase 3 deferral). Seeded decorative fixture images (icons, map pin, purely decorative tiles that have media rows) get `isDecorative: true`, so the missing-alt counter (mk-parity D1.1) doesn't flag them. Add a test: zero seeded images are missing alt.
- **R6-5 Migrate job.** Register `migrate-media` in `server/lib/jobs/index.ts` (Phase 5 deferral). It is idempotent, skips `static`, and moves disk → R2 under `cp/` with progress, as SP does.

---

### Task 1: R2 driver and hard `cp/` prefix (master 6.1; R6-1, R6-2)

**Files (port, then adapt):**
- `server/lib/r2-client.ts`: `r2ObjectKey` with the `cp/` root, plus `R2_PREFIX`
- `server/lib/storage/{r2,index}.ts`, with the full SP versions restored
- `lib/schemas/integrations/r2.ts`: `keyPrefix` validation

**Tests:**
- Port SP's `tests/unit/storage/*`, `r2-client`, and `storage-drivers`.
- Add the R6-1 prefix tests and the grep guard.
- Replace `r2-guard.test.ts`.

**Commit:** `feat: add r2 storage driver confined to the cp/ prefix`

---

### Task 2: Media service restore and management (master 6.2; R6-2, R6-4)

**Files (restore from SP):** the media service R2 and migrate pieces, `deleteStoredFile`, the warnings, and seeded `isDecorative` in `server/db/seed/fixtures/media.ts`.

**Tests:**
- Restore the 2 dropped `media-manage-hardening` R2 cases.
- Port SP's remaining media integration tests: `media-usages`, `media-decorative`, `media-missing-alt`, and any not already in CP.
- Add the zero-missing-alt-on-seed test.

**Commit:** `feat: restore r2-aware media service and decorative seed media`

---

### Task 3: Media library screen (master 6.3)

**Files (port):**
- `app/(admin)/admin/(panel)/media/page.tsx`
- `components/admin/media/{library,media-details,focal-point,lottie-tile,format}.tsx`, the ones not already ported
- the related hooks

Use CP copy.

**Tests:**
- Port SP's DOM tests: `media-library`, `media-details`, `migrate-media-panel` (if it lives here), `use-media-item`.
- Port the e2e `media.spec.ts`. It must cover:
  - upload with progress;
  - editing alt and decorative;
  - replace;
  - delete in use → 409;
  - changing the home hero image through the picker in the page editor → after publish, the public `/` uses the new image.
- Restore the seeded hero in `afterAll`. Visual must stay deterministic.
- Add the `b3-panel-pages`/`page-guards` media pins.
- Take screenshots of the library (grid and details sheet) and view them.

**Commit:** `feat: add media library screen`

---

### Task 4: Migrate uploads to R2 (master 6.4; R6-3, R6-5)

**Files (port):**
- `server/lib/jobs/migrate-media.ts` and its registration
- the migrate route at SP's path, plus the integrations route mount if R6-3 applies
- the progress UI component, placed where SP places it (in the R2 integration screen, wired in 7.1; or in media)

**Tests:** port SP's migrate tests, using a mocked S3 client that records keys. Check that:
- the job is idempotent;
- static media is skipped;
- the driver and key are updated;
- every key is under `cp/`;
- progress is reported.

**Commit:** `feat: add move-uploads-to-r2 job`

---

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```
