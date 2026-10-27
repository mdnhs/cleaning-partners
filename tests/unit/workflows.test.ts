import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const ci = readFileSync(".github/workflows/ci.yml", "utf8")
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8")
const dependabot = readFileSync(".github/dependabot.yml", "utf8")

/** The `if:` line of `job` in a workflow (first one after the job key). */
const jobIf = (workflow: string, job: string) =>
  workflow.split(`\n  ${job}:\n`)[1]?.match(/\n    if: (.*)\n/)?.[1] ?? ""

/** The text of one job: from its key to the next job (or the end). */
const jobBody = (workflow: string, job: string) =>
  workflow.split(`\n  ${job}:\n`)[1]?.split(/\n  [a-z][a-z-]*:\n/)[0] ?? ""

describe("CI + deploy gating (R11-9)", () => {
  it("CI runs every gate, with Postgres and Mailpit where needed", () => {
    for (const job of ["static:", "integration:", "build:", "e2e:", "image:"])
      expect(ci).toContain(`  ${job}`)
    for (const command of [
      "pnpm lint",
      "pnpm exec next typegen",
      "pnpm typecheck",
      "pnpm test:unit",
      "pnpm exec vitest run --project dom",
      "pnpm audit:deps",
      "pnpm test:integration",
      "pnpm build",
      "pnpm scripts:build",
      "pnpm test:e2e",
      "scripts/check-log-secrets.ts e2e.log",
      "node scripts/dist/seed.mjs --if-empty",
      "[db:seed] empty database (no pages): content seeded",
      "auto-seed skipped, no data changed",
      "node scripts/dist/backup.mjs",
      "node scripts/dist/restore-drill.mjs",
    ])
      expect(ci).toContain(command)
    // Postgres 17.11 on 5434 for integration, e2e and the image smoke; Mailpit
    // on 1026/8026 for integration and e2e.
    expect(ci.match(/image: postgres:17\.11\n/g)).toHaveLength(3)
    expect(ci.match(/ports: \["5434:\d+"\]/g)).toHaveLength(3)
    expect(ci.match(/axllent\/mailpit:v1\.31\.4/g)).toHaveLength(2)
    expect(ci.match(/ports: \["1026:\d+", "8026:\d+"\]/g)).toHaveLength(2)
    expect(ci).toContain("CREATE DATABASE cp_test")
    expect(ci).toContain("CREATE DATABASE cp_e2e")
    expect(ci).toContain("POSTGRES_DB: cp_smoke")
    expect(ci).toContain("workflow_call:")
    expect(ci).not.toContain("test:visual")
  })

  it("the dom step no longer passes with no tests", () => {
    expect(ci).not.toContain("--passWithNoTests")
    expect(ci).not.toContain("Phase 2 adds dom tests")
  })

  it("the e2e job tees the log, asserts the Mailpit test ran and scans for secrets", () => {
    const e2e = jobBody(ci, "e2e")
    expect(e2e).toContain("pnpm test:e2e 2>&1 | tee e2e.log")
    expect(e2e).toContain("set -o pipefail")
    expect(e2e).toContain("Test connection reaches the dev Mailpit")
    expect(e2e).toContain("pnpm exec tsx scripts/check-log-secrets.ts e2e.log")
    expect(e2e).toContain("if: failure()")
    expect(e2e).toContain("e2e.log")
    // The ran-check sits between the run and the secrets scan.
    expect(e2e.indexOf("Mailpit round trip ran")).toBeGreaterThan(
      e2e.indexOf("tee e2e.log")
    )
  })

  it("the image job uses cp:ci, the container name cp, and exactly three variables", () => {
    const image = jobBody(ci, "image")
    expect(image).toContain("tags: cp:ci")
    expect(image).toContain("push: false")
    expect(image).toContain(
      "--name cp --network host --env-file smoke.env cp:ci"
    )
    expect(image).toContain(
      "docker exec cp wget -qO- http://127.0.0.1:3000/api/v1/health/live"
    )
    expect(image).toContain("/api/v1/health && exit 0")
    const envLines = image.match(/echo "[A-Z_]+=/g) ?? []
    expect(envLines.sort()).toEqual([
      'echo "BETTER_AUTH_SECRET=',
      'echo "BETTER_AUTH_URL=',
      'echo "DATABASE_URL=',
    ])
    expect(image).toContain("cp_smoke")
  })

  it("CI runs once per change: PRs directly, main through deploy.yml", () => {
    expect(ci).toMatch(/on:\n  pull_request:\n  workflow_call:\n/)
    expect(ci).not.toMatch(/^  push:/m)
    expect(ci).toContain(
      "cancel-in-progress: ${{ github.event_name == 'pull_request' }}"
    )
  })

  it("every action is pinned by commit SHA with its version noted", () => {
    for (const workflow of [ci, deploy]) {
      const uses = [...workflow.matchAll(/uses: (\S+)(.*)/g)].filter(
        ([, ref]) => !ref!.startsWith("./")
      )
      expect(uses.length).toBeGreaterThan(0)
      for (const [line, ref, comment] of uses) {
        expect(ref, line).toMatch(/@[0-9a-f]{40}$/)
        expect(comment, line).toMatch(/^ # v\d+\.\d+\.\d+$/)
      }
    }
    expect(ci).not.toMatch(/image: postgres:17\n/)
  })

  it("dependabot covers github-actions and npm weekly", () => {
    expect(dependabot).toContain("package-ecosystem: github-actions")
    expect(dependabot).toContain("package-ecosystem: npm")
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2)
  })

  it("deploy keeps its trigger and waits for CI", () => {
    expect(deploy).toMatch(
      /on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:\n    inputs:\n      skip_ci:/
    )
    expect(deploy).toContain("uses: ./.github/workflows/ci.yml")
    expect(deploy).toContain("needs: ci")
    expect(deploy).toContain("skip_ci")
    expect(jobBody(deploy, "build-and-push")).toContain(
      "needs.ci.result == 'success'"
    )
  })

  it("skip_ci exists only on workflow_dispatch", () => {
    // The input is declared once, under workflow_dispatch; the push trigger has none.
    expect(deploy.match(/skip_ci:/g)).toHaveLength(1)
    const onBlock = deploy.split("\npermissions:")[0]!
    expect(onBlock.indexOf("skip_ci:")).toBeGreaterThan(
      onBlock.indexOf("workflow_dispatch:")
    )
    expect(onBlock.split("workflow_dispatch:")[0]).not.toContain("skip_ci")
    for (const job of ["build-and-push"])
      expect(jobIf(deploy, job)).toContain(
        "github.event_name == 'workflow_dispatch' && inputs.skip_ci"
      )
  })

  it("no job names a branch other than main", () => {
    for (const workflow of [ci, deploy])
      for (const [, list] of workflow.matchAll(/branches:\s*(.*)/g))
        expect(list).toBe("[main]")
    expect(ci).not.toContain("branches:")
    expect(deploy).not.toMatch(/refs\/heads\/(?!main\b)/)
  })

  it("only main deploys, and the skip_ci emergency path reaches the deploy", () => {
    for (const job of ["ci", "build-and-push", "ensure-env", "deploy"])
      expect(jobIf(deploy, job), job).toContain(
        "github.ref == 'refs/heads/main'"
      )
    expect(jobIf(deploy, "build-and-push")).toContain("!cancelled()")
    expect(jobIf(deploy, "ensure-env")).toContain("!cancelled()")
    expect(jobIf(deploy, "ensure-env")).toContain(
      "needs.build-and-push.result == 'success'"
    )
    // The deploy runs only once the production environment is complete.
    expect(jobIf(deploy, "deploy")).toContain("!cancelled()")
    expect(jobIf(deploy, "deploy")).toContain(
      "needs.ensure-env.result == 'success'"
    )
    expect(jobBody(deploy, "ensure-env")).toContain("environment: production")
    expect(jobBody(deploy, "deploy")).toContain("environment: production")
  })

  it("ensure-env and deploy use the CP values, with no SP leftovers", () => {
    expect(deploy.match(/kbL1xMktOKmL7i2YfGt-W/g)).toHaveLength(2)
    expect(deploy).toContain("COMPOSE_ID: kbL1xMktOKmL7i2YfGt-W")
    expect(deploy).toContain("SITE_URL: https://cleaning.raynx.ie")
    expect(deploy).toContain("postgres://cp:${password}@cleaning-partners-db:")
    expect(deploy).toContain("group: deploy-cleaning-partners")
    expect(deploy).toContain("CP_IMPORT_KEY")
    expect(deploy).toContain("CP_IMPORT_SOURCE_SECRET")
    for (const workflow of [ci, deploy]) {
      expect(workflow).not.toMatch(/SP_/)
      expect(workflow).not.toMatch(/security/i)
      expect(workflow).not.toMatch(/\bsp:/)
      expect(workflow).not.toMatch(/\bsp\b/)
    }
  })

  it("R2 inputs are optional and CP_R2_PREFIX is never added", () => {
    for (const workflow of [ci, deploy, dependabot])
      expect(workflow).not.toContain("CP_R2_PREFIX")
    expect(deploy).toContain("add_if_set CP_R2_ACCOUNT_ID")
    expect(deploy).toContain("add_if_set CP_R2_BUCKET")
    expect(deploy).not.toMatch(/\n\s+add CP_R2_/)
    // Only the Dokploy credentials are required.
    expect(deploy).toContain("for name in DOKPLOY_URL DOKPLOY_API_KEY; do")
  })

  it("the image entrypoint migrates, auto-seeds an empty database, then execs", () => {
    const entrypoint = readFileSync("docker-entrypoint.sh", "utf8")
    const migrate = entrypoint.indexOf("node scripts/dist/migrate.mjs")
    const seed = entrypoint.indexOf("node scripts/dist/seed.mjs --if-empty")
    const exec = entrypoint.indexOf('exec "$@"')
    expect(migrate).toBeGreaterThan(0)
    expect(seed).toBeGreaterThan(migrate)
    expect(exec).toBeGreaterThan(seed)
    expect(entrypoint).not.toContain("--allow-production")
  })

  it("permissions are least-privilege: only build-and-push may write packages", () => {
    expect(deploy.match(/packages: write/g)).toHaveLength(1)
    const buildJob = jobBody(deploy, "build-and-push")
    expect(buildJob).toContain("packages: write")
    expect(deploy).toMatch(/^permissions:\n  contents: read\n/m)
    expect(ci).toMatch(/^permissions:\n  contents: read\n/m)
    expect(ci).not.toContain("write")
    expect(jobBody(deploy, "ci")).toContain(
      "permissions:\n      contents: read"
    )
  })
})
