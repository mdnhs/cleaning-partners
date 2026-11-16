#!/usr/bin/env bash
# Fast path to production (~4 min instead of ~25): checks everything that runs
# locally, pushes main, cancels the push-triggered CI run and dispatches the
# deploy with the workflow's own `skip_ci` emergency switch.
#
# Skipped on purpose: the Integration and E2E suites (they need Postgres and
# take ~13 and ~20 min in CI). Use it for small, low-risk changes you have
# looked at; the normal `git push` (full CI, then deploy) stays the default.
set -euo pipefail

cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || { echo "ship-fast: run it on main (now: $branch)"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "ship-fast: commit your changes first"; exit 1; }

echo "== local checks (typecheck, lint, unit, dom, build)"
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm exec vitest run --project dom
pnpm build

echo "== push"
git push origin main
sha=$(git rev-parse HEAD)

echo "== cancel the push-triggered run (it would wait for the full CI)"
for _ in $(seq 1 20); do
  run=$(gh run list --workflow deploy.yml --branch main --event push --commit "$sha" \
    --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
  [ -n "${run:-}" ] && break
  sleep 3
done
[ -n "${run:-}" ] && gh run cancel "$run" >/dev/null 2>&1 || true

echo "== dispatch deploy without CI"
sleep 5
gh workflow run deploy.yml --ref main -f skip_ci=true
sleep 8
id=$(gh run list --workflow deploy.yml --event workflow_dispatch --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$id" --exit-status --interval 15
