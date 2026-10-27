# Cleaning Partners

The Cleaning Partners Ltd website (`cleaning.raynx.ie`) and its admin panel, one
Next.js app on Postgres. The public site renders from the database and looks
the same as the original static design; everything on it is editable under
`/admin` (pages, services, blog, media, enquiries, SEO, marketing, appearance,
page builder, AI assistant). The admin and backend follow the sister
company's platform; the public design is frozen.

Operations are in [`docs/runbook.md`](docs/runbook.md), the go-live list in
[`docs/launch.md`](docs/launch.md), and the project brief in
[`docs/brief.md`](docs/brief.md).

## Development setup

Needs Node 22, pnpm, Docker. Copy your environment into `.env.development`
(`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), then:

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d --wait && pnpm db:migrate && pnpm db:seed && pnpm demo:seed
pnpm admin:create --email you@example.ie --name "Your Name"
pnpm dev
```

Dev Postgres is on port 5434 and Mailpit on 1026 (SMTP) / 8026 (web), so it
can run beside other projects. `pnpm db:down` stops them.

## Scripts

| Script | What it does |
| --- | --- |
| `dev`, `build`, `start` | Next.js |
| `db:up`, `db:down` | Dev Postgres + Mailpit |
| `db:generate`, `db:migrate` | Drizzle migrations |
| `db:seed`, `demo:seed`, `demo:remove` | Site content; demo accounts and data |
| `admin:create`, `owner:recover` | First owner; recover a locked-out owner |
| `backup`, `restore-drill` | `pg_dump` backup; restore it into a scratch database |
| `secrets:rotate` | Re-encrypt secrets after a `BETTER_AUTH_SECRET` change |
| `custom-code:off` | Kill switch for custom code |
| `db:sync` | Copy a database between environments |
| `r2:bootstrap`, `data:export-to-r2`, `data:import` | R2 setup; one-shot local-data import |
| `scripts:build` | Bundle the operator scripts into `scripts/dist/*.mjs` (the image runs these) |
| `audit:deps` | Production dependency audit |

## Checks

```bash
pnpm lint && pnpm typecheck
pnpm test:unit                       # unit
pnpm exec vitest run --project dom   # DOM components
pnpm db:up && pnpm test:integration  # needs the dev Postgres
pnpm test:e2e                        # builds and serves the standalone app
pnpm test:visual                     # pixel diffs, macOS only
pnpm audit:deps && pnpm scripts:build
```

## Development notes

- Never run `pnpm test:visual:update`: the public baselines are frozen.
  New baselines come only from `playwright test <new spec> --update-snapshots=missing`.
- The app reads exactly three environment variables; everything else
  (SMTP, R2, Turnstile, AI, tracking) is set in the admin.
- Everything written to R2 lives under `cp/`.
- Production runs exactly one app container.
- This is Next.js 16 with breaking changes: read `node_modules/next/dist/docs/`
  before writing Next-specific code (see `AGENTS.md`).
