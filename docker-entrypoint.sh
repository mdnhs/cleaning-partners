#!/bin/sh
# Container entrypoint (PID 1 is tini, which forwards SIGTERM): apply pending
# database migrations, import local data once if asked, seed the site content
# if the database is empty, save R2 settings from CP_R2_* once, then exec the
# command (default CMD: node server.js).
# A failed migration or seed exits non-zero: the container stops and Docker's
# restart policy starts it again, a crash loop until the cause is fixed. The
# previous container is already gone by then, so read `docker logs` right
# after a deploy (docs/runbook.md "Deploy").
set -eu

echo "[entrypoint] applying database migrations"
node scripts/dist/migrate.mjs

# One-shot import of a `pnpm data:export-to-r2` dump (docs/runbook.md
# "Import local data into production"). Runs on every start and does nothing
# (logs "[import] CP_IMPORT_KEY not set") without CP_IMPORT_KEY, or when this
# database already holds that import. Always exits 0: failures are logged
# (`[import] FAIL …` after a restore; the marker then prevents a second
# restore) and the start continues. Migrations run again after an import: the
# dump may predate this release.
node scripts/dist/data-import.mjs
if [ -n "${CP_IMPORT_KEY:-}" ]; then
  node scripts/dist/migrate.mjs
fi

# First deploy only: a database with no pages gets the seeded content. Any
# existing page means the site has content and nothing is written; the line
# it logs says which.
echo "[entrypoint] seeding content if the database is empty"
node scripts/dist/seed.mjs --if-empty

# Settings ▸ Integrations ▸ R2 from CP_R2_* when not saved yet (never
# overwrites; never fails the start).
node scripts/dist/r2-bootstrap.mjs

# The input-only variables are for the scripts above: the app never sees them.
unset CP_R2_ACCOUNT_ID CP_R2_ACCESS_KEY_ID CP_R2_SECRET_ACCESS_KEY CP_R2_BUCKET \
  CP_R2_PREFIX CP_IMPORT_KEY CP_IMPORT_SOURCE_SECRET

echo "[entrypoint] starting: $*"
exec "$@"
