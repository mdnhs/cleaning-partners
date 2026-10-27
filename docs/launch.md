# Launch checklist: cleaning.raynx.ie

Operations detail for every item is in `docs/runbook.md`. Nothing here has
been pushed or merged: cut-over is the owner's call (step 3).

## Agent did

- The public site renders entirely from Postgres, pixel-identical to the
  static site (Playwright visual diff, 0 px at 1440 and 390 wide).
- Admin at `/admin`: pages, the `/p/<slug>` page builder, services, articles
  (draft, review, schedule, publish), team, clients, group companies,
  testimonials, categories, media library, enquiries inbox + CSV export, SEO
  (metadata, JSON-LD, OG images, sitemap, robots, redirects), marketing
  (tracking, consent banner, custom code), appearance and design, settings,
  integrations, users (invite, roles, 2FA, sessions, "View as"), activity log,
  AI assistant, dashboard, Help.
- Seven roles enforced in the UI and the API.
- Email (SMTP), media (Cloudflare R2 under `cp/`, local disk until then),
  Turnstile and AI keys are configured in the admin and stored encrypted.
- Daily backups with a restore drill, secret rotation (`secrets:rotate`),
  environment sync (`db:sync`), owner recovery, demo-account removal
  (`demo:remove`), custom-code kill switch (`custom-code:off`), local data
  import.
- CI (lint, types, unit, DOM, integration, build without env, E2E on the
  standalone server, Docker image smoke test incl. backup + restore drill)
  gates every deploy from `main`. The deploy workflow is dormant until the
  owner merges.
- Security headers, a non-restrictive Content-Security-Policy, production
  guards on the three environment variables, a production-only dependency
  audit (`pnpm audit:deps`), and an R2 client that cannot touch anything
  outside `cp/`.
- Runbook: `docs/runbook.md`, with the Help page linking its guides.

Known limitations are listed in the runbook ("Known limitations").

## Owner must do

1. **Dokploy (spec step 1).**
   - [ ] Use the existing compose app (`kbL1xMktOKmL7i2YfGt-W`) for
         `cleaning.raynx.ie`, with Postgres 17. Recommended: the compose `db`
         service, where `POSTGRES_PASSWORD` is set once. The alternative is a
         separate Dokploy Postgres service on `dokploy-network`.
   - [ ] Set the three app variables `DATABASE_URL`, `BETTER_AUTH_SECRET` and
         `BETTER_AUTH_URL=https://cleaning.raynx.ie`, **and** `POSTGRES_PASSWORD`
         for the compose `db` service (the password inside `DATABASE_URL`).
         `docker-compose.yml` requires `POSTGRES_PASSWORD`, and `ensure-env`
         refuses to run when `DATABASE_URL` exists without it, so the first
         gated deploy would fail on purpose. `BETTER_AUTH_SECRET` must be new
         (`openssl rand -base64 48`), never the sister site's; keep it in the
         password manager. `ensure-env` would generate any missing ones on the
         first gated deploy, and never changes an existing value.
   - [ ] Run exactly one app container (`replicas: 1`; never scale the
         service). The page cache and the scheduler's cache expiry are per
         process, so a second container would serve stale pages after a
         publish (runbook "Deploy").
   - [ ] GitHub repo secrets `DOKPLOY_URL` and `DOKPLOY_API_KEY`; optionally
         `CP_R2_ACCOUNT_ID`, `CP_R2_ACCESS_KEY_ID`, `CP_R2_SECRET_ACCESS_KEY`
         and `CP_R2_BUCKET`. Optionally add required reviewers under
         Settings, Environments, `production`.
2. **Proxy chain.**
   - [ ] Confirm the three answers under "Owner must confirm" (a), (b) and
         (c), and fix Traefik if they differ.
   - [ ] Add the Traefik `rateLimit` middleware for `/og/*`,
         `/api/v1/admin/ai/*` and `/api/v1/admin/preview` (runbook "Rate
         limits at the proxy").
3. **Cut-over.**
   - [ ] Merge `feat/dynamic-platform` into `main`. That is the owner's call.
         CI then runs, and deploy follows only on success.
   - [ ] Check `docker logs` for the migrate lines and
         `[db:seed] empty database (no pages): content seeded`.
4. **First owner (spec step 2).**
   - [ ] Run `node scripts/dist/admin-create.mjs --email <owner email> --name "<name>"`
         in the container, **once** (every run creates another owner), set the
         password and turn on 2FA. Never run `seed.mjs --allow-production` on
         the live site.
5. **Settings, Integrations (spec step 3).**
   - [ ] SMTP: real credentials, then "Test".
   - [ ] R2: the same bucket as the sister site (owner decision O7); keys go
         under `cp/`. Use an API token with **Object Read & Write**; the
         bucket stays private. Then "Test", then "Move uploads to R2".
   - [ ] Turnstile in **Invisible** mode for the domain, then "Test".
   - [ ] AI (optional): the provider key and the allowed roles; settle the
         "Owner must confirm" item first.
   - [ ] Settings, Leads: recipients (default `info@cleaningpartners.ie`) and
         retention (24 months).
6. **Legal copy (spec step 4).**
   - [ ] Review the placeholder Privacy and Terms copy, and the service detail
         copy for the four services Figma did not cover. Until they are
         replaced, tick noindex in their SEO tab.
7. **SEO.**
   - [ ] Set `settings.site.productionUrl` to `https://cleaning.raynx.ie` (or
         the final domain) under SEO, Defaults. Until it is set, canonical,
         sitemap, JSON-LD and OG fall back to `BETTER_AUTH_URL`, and staging is
         indexable.
   - [ ] Robots noindex mode (`Disallow: /`) stops crawlers from ever seeing
         the noindex tag, so serve noindex before switching.
8. **Backups.**
   - [ ] The daily job writes to `cp/backups/` in R2 once R2 is saved, and to
         `/data/backups` before that. Retention is 14.
   - [ ] Take `node scripts/dist/backup.mjs` before any deploy that changes the
         database.
   - [ ] After a day, the dashboard shows no failing jobs and a backup exists.
         Run `restore-drill` once, then monthly.
   - [ ] Never add an R2 lifecycle rule that covers `cp/`.
9. **The rest.**
   - [ ] Marketing tracking: turn it on only when ready (the consent banner
         appears then). Custom code is the owner's responsibility; it runs
         without waiting for consent when marked `necessary`.
   - [ ] Invite staff with the right roles; owners turn on 2FA.
   - [ ] `demo:remove` (`node scripts/dist/demo-remove.mjs`) if `demo:seed`
         ever ran on production.
   - [ ] Keep Traefik access-log retention short: the lead export for a
         data-subject request puts the person's email in the URL.

## Owner must confirm

- **The proxy chain answers (runbook "Client IPs and Traefik"):**
  - (a) the `cleaning.raynx.ie` DNS record is DNS-only or proxied through
    Cloudflare (if proxied, only Cloudflare's IP ranges may be added to the
    entrypoint's `forwardedHeaders.trustedIPs`);
  - (b) the Traefik public entrypoint has no `forwardedHeaders.insecure` and no
    `trustedIPs` other than Cloudflare's ranges;
  - (c) the compose app publishes no host port.

  The answers are expected to match the sister site's on the same Dokploy
  server.
- **A shared R2 bucket with the sister site (O7).** R2 tokens cannot be limited
  to a prefix, so CP's token can technically reach the other site's folder. The
  code's `cp/` guard is the protection. A separate bucket is the stronger
  option, and also keeps backups apart.
- **No bucket-wide lifecycle rule** removes `cp/backups/`.
- **Enquiry consent basis.** The contact form sends `consent: true` from the
  form's consent box. That means only "the visitor submitted the form to be
  contacted about this enquiry", never consent to marketing. The legal basis is
  replying to the request (GDPR Art. 6(1)(b), or legitimate interest,
  Art. 6(1)(f)). Confirm it, and that the privacy policy explains it.
- **Cloudflare as GDPR processor:** Turnstile receives each enquirer's IP
  address and browser signals; R2 stores media and backups. Confirm Cloudflare
  as a processor and name it in the privacy policy.
- **The AI provider as GDPR processor when "share enquiry details" is on.**
  Names, companies, messages and notes are sent to the provider, and addresses
  and Eircodes typed into messages are not redacted. Confirm, or keep the
  switch off. An admin using "View as" can read that user's AI conversations.
- **A Turnstile outage drops leads with a 422:** when Cloudflare's
  verification service is unreachable, the enquiry is refused and nothing is
  stored. Accept that, or watch the dashboard.
- **Brand contrast.** White on the frozen brand `#11b1d1` is 2.55:1, below WCAG
  3:1 (large text) and 4.5:1. A deeper brand can be chosen in Appearance.
- **The Cookie-settings pill contrast** on the public site.
- **Optionally, Git LFS** for the visual PNGs.
- **Admin on the public origin.** The admin and API share the public origin, so
  a Google Tag Manager container (owner-only to change) can act with a signed-in
  admin's session. A separate admin origin would remove that risk.
