# Phase 8 Task 14 report: attribution e2e and Lighthouse SEO 100

Commit: "test: restore attribution e2e and add lighthouse seo gate".

## Files
- tests/e2e/leads.spec.ts: `8.3:` marker replaced by the first-touch attribution test (owner publishes tracking.enabled, no channel IDs, via marketing API; visitor lands on /?utm_source=e2e&utm_medium=cpc&utm_campaign=cp-test, Accept all, submits /contact#quote; drawer Source shows e2e / cpc / cp-test). Second visitor Reject non-essential: sessionStorage cp_attribution null, lead shows "No source was recorded". Tracking draft restored in `finally`. sendEnquiry now goes to /contact#quote. Leads cleaned by the existing @e2e.cleaningpartners.test afterAll.
- tests/e2e/lighthouse-seo.spec.ts: SP's Lighthouse test ported verbatim (no branding strings present); head-check test kept.
- No public markup, env, deps or baselines changed.

## Lighthouse
SEO category score 1, zero failing weighted audits on `/`. No fix needed.

## Stability
leads.spec + lighthouse-seo.spec run twice: 10 passed each time.

## Gate
lint, typecheck clean; vitest 305 files, 4416 passed, 1 todo; build (no env) ok; visual 44/44; e2e 153 passed, 1 skipped (Mailpit).
- `^// 8.3:` marker: none. Remaining "Phase 8" text matches are descriptive comments, not deferrals: lib/admin/settings-keys.ts, lib/schemas/common.ts, lib/schemas/settings/{consent,tracking}.ts, server/modules/redirects/resolve.ts, server/modules/settings/service.ts, templates/shared/page-meta.ts, tests/e2e/seo-admin.spec.ts; plus "spec §8.x"/"master 8.x" citations.
- it.todo in collections/articles/dashboard tests: only dashboard.test.ts:345 "(9.3)", a Phase 9 item.
- git diff 21d478c on brief-inventory.json, visual screenshots, server/env.ts, package.json, pnpm-lock.yaml: empty.
- Cut-over (R8-8): the 8.2 blocker is cleared; cut-over still waits for Phases 9-11 and the owner.
