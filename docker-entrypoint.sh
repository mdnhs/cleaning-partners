#!/bin/sh
# Container entrypoint (PID 1 is tini, which forwards SIGTERM): apply pending
# database migrations, then exec the command (default CMD: node server.js).
# A failed migration exits non-zero: the container stops and Docker's restart
# policy starts it again, a crash loop until the cause is fixed. The previous
# container is already gone by then, so read `docker logs` right after a
# deploy. Content seeding runs when the database is empty; data import and R2
# bootstrap (added in Task 11.1; not active yet) go here.
set -eu

echo "[entrypoint] applying database migrations"
node scripts/dist/migrate.mjs

# First deploy only: a database with no pages gets the seeded content. Any
# existing page means the site has content and nothing is written; the line
# it logs says which.
echo "[entrypoint] seeding content if the database is empty"
node scripts/dist/seed.mjs --if-empty

echo "[entrypoint] starting: $*"
exec "$@"
