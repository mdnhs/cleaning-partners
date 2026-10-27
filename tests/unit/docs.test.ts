import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { HELP_GUIDES } from "@/components/admin/help/help-view"

const read = (file: string) => readFileSync(file, "utf8")
const DOCS = ["docs/runbook.md", "docs/launch.md", "README.md"]

const pkg = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>
}
// pnpm's own commands (not package scripts).
const PNPM_BUILTINS = new Set(["install", "exec", "audit", "add", "dlx"])
const bundles = [
  ...read("scripts/build-scripts.ts").matchAll(/^\s+"([a-z0-9-]+)",$/gm),
].map((m) => m[1]!)

describe("operations docs", () => {
  it("the runbook covers every operation", () => {
    const runbook = read("docs/runbook.md")
    for (const heading of [
      "## Deploy",
      "## First production deploy",
      "## Postgres in the compose stack",
      "## R2 folder and bootstrap",
      "## Import local data into production",
      "## Rollback",
      "## Running scripts in the container",
      "## Backups and the restore drill",
      "## Restore a backup",
      "## Rotate BETTER_AUTH_SECRET",
      "## Copy a database between environments (db:sync)",
      "## Owner locked out",
      "## Client IPs and Traefik",
      "## Rate limits at the proxy (Traefik)",
      "## Background jobs",
      "## Sessions and sign-in",
      "## Security headers",
      "## Custom code and Content-Security-Policy",
      "## Verify domains by DNS",
      "## Appearance (theme)",
      "## Page builder",
      "## AI assistant",
      "## Logs",
      "## Dependency audit",
      "## Known limitations",
    ])
      expect(runbook, heading).toContain(heading)
  })

  it("names the Dokploy facts and the accepted launch caveats", () => {
    const runbook = read("docs/runbook.md")
    for (const text of [
      "kbL1xMktOKmL7i2YfGt-W",
      "cleaning.raynx.ie",
      "cleaning-partners-db",
      "no restrictive CSP",
      "2FA is cleared on `secrets:rotate`",
      "6 moderate and 2",
      "actionlint",
      "retries: 2",
    ])
      expect(runbook, text).toContain(text)
  })

  it("the launch checklist lists what the owner must do and confirm", () => {
    const launch = read("docs/launch.md")
    for (const text of [
      "# Launch checklist: cleaning.raynx.ie",
      "## Agent did",
      "## Owner must do",
      "## Owner must confirm",
      "dokploy-network",
      "demo:remove",
      "Invisible",
      "Object Read & Write",
      "GDPR processor",
      "productionUrl",
      "POSTGRES_PASSWORD",
      "kbL1xMktOKmL7i2YfGt-W",
    ])
      expect(launch, text).toContain(text)
  })

  it("the README is the project's, not the template's", () => {
    const readme = read("README.md")
    expect(readme).not.toContain("This is a Next.js template with shadcn/ui.")
    expect(readme).toContain(
      "docker compose -f docker-compose.dev.yml up -d --wait && pnpm db:migrate && pnpm db:seed && pnpm demo:seed"
    )
  })

  it("the docs say to run exactly one app container, and compose agrees", () => {
    for (const file of ["docs/runbook.md", "docs/launch.md"])
      expect(read(file).toLowerCase(), file).toContain(
        "run exactly one app container"
      )
    expect(read("docker-compose.yml")).toMatch(/deploy:\n\s+replicas: 1\n/)
  })

  it("production bootstrap relies on the auto-seed", () => {
    expect(read("docs/runbook.md")).toContain("seed.mjs --if-empty")
  })

  it("every `pnpm <script>` in the docs exists in package.json", () => {
    for (const file of DOCS) {
      for (const m of read(file).matchAll(/\bpnpm (?:run )?([a-z][\w:-]*)/g)) {
        const name = m[1]!
        if (PNPM_BUILTINS.has(name)) continue
        expect(pkg.scripts, `${file}: pnpm ${name}`).toHaveProperty(name)
      }
    }
  })

  it("every scripts/dist bundle in the docs is built by build-scripts.ts", () => {
    expect(bundles.length).toBeGreaterThan(10)
    for (const file of DOCS) {
      for (const m of read(file).matchAll(/scripts\/dist\/([a-z0-9-]+)\.mjs/g))
        expect(bundles, `${file}: ${m[0]}`).toContain(m[1]!)
    }
  })

  it("every Help guide is a runbook heading", () => {
    const runbook = read("docs/runbook.md")
    for (const guide of HELP_GUIDES) expect(runbook).toContain(`## ${guide}\n`)
  })

  it("the docs carry no sister-site strings", () => {
    // Built from pieces so this file does not trip the branding gate itself.
    const banned = new RegExp(
      [
        "security" + " partners",
        "securitypartners" + "ltd",
        "security\\" + ".raynx",
        "security" + "-partners",
        "\\bSP" + "_[A-Z]",
        "\\bsp" + "[-.][a-z]",
      ].join("|"),
      "i"
    )
    for (const file of DOCS) expect(read(file), file).not.toMatch(banned)
  })

  it("the docs contain no secret-looking values", () => {
    for (const file of DOCS)
      expect(read(file), file).not.toMatch(
        /postgres:\/\/[^\s:@<]+:(?!<)[^\s@<]+@|BETTER_AUTH_SECRET=[A-Za-z0-9+/]{20,}/
      )
  })

  it("the brief's Changes log covers the hardening deviations", () => {
    const brief = read("docs/brief.md")
    const changes = brief.slice(brief.indexOf("## Changes"))
    for (const text of [
      "/api/v1/public/leads",
      "consent: true",
      "cp/",
      "CP_R2_PREFIX",
      "kbL1xMktOKmL7i2YfGt-W",
      "run exactly one app container",
      "non-restrictive",
      "#11b1d1",
    ])
      expect(changes, text).toContain(text)
  })

  it("every doc path it points at exists", () => {
    for (const file of ["docs/runbook.md", "docs/launch.md"])
      for (const m of read(file).matchAll(/`(docs\/[a-z-]+\.(?:md|json))`/g))
        expect(existsSync(m[1]!), `${file}: ${m[1]}`).toBe(true)
    // git knows the docs (not ignored).
    const tracked = execFileSync(
      "git",
      ["ls-files", "-co", "--exclude-standard", "docs/runbook.md"],
      { encoding: "utf8" }
    )
    expect(tracked).toContain("docs/runbook.md")
  })
})
