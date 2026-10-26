import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

// Branding gate: nothing tracked may still carry Security Partners (SP)
// identifiers, except where SP is cited as the reference repo or as content.
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
  /\bx-sp-/i,
  /\bsp:(consent|navigate)\b/,
  /\bsp_(consent|attribution)\b/,
  /__sp[A-Z]/,
  /Security Partners/,
  /\bSP_[A-Z]/,
  /\bsp[-.][a-z]/,
  /\b[Ss]p[A-Z][a-z]/,
  /["']sp\/?["']/,
  /\/\/sp:/,
  // SP's dev ports: CP runs beside SP on 5434 / 1026 / 8026 / 3200.
  /\b(1025|8025|3100)\b/,
  /:543[23]\b/,
  // SP palette (lib/theme/sp-admin.ts, presets.ts); CP has its own brand.
  /#(367318|67bd31|7cc84a|4e9a22|2f5f14|eef6e8|0d1b36|2f6a15|a7d98a|709f53|b7e892|1b3566|071022|13284d|3f6b25|4a7731|1f3318|cfeab8|2751a3|03428f)\b/i,
]
// Whole files that may cite SP (the reference repo, or the sister company as content).
const FILE_ALLOW = [
  /^docs\/superpowers\//,
  /^docs\/brief(-inventory\.json|\.md)$/,
  /^tests\/unit\/branding\.test\.ts$/,
]
// Single-line allowances: file + exact line content.
const FILE_LINE_ALLOW: { file: RegExp; line: RegExp }[] = [
  // The guard test must name SP's test database to prove it is refused.
  {
    file: /^tests\/unit\/test-db-guard\.test\.ts$/,
    line: /^it\.each\(\["sp_test", "postgres", "cp_dev", "cp_test_old"\]\)\($/,
  },
  // SP's HKDF salt, used to prove CP's isolation from SP.
  {
    file: /^tests\/unit\/crypto\.test\.ts$/,
    line: /^const FOREIGN_SALT = "sp\/v1"$/,
  },
  // Pure colour math on a sample hex that happens to be SP's green.
  {
    file: /^tests\/unit\/theme\/color\.test\.ts$/,
    line: /^expect\(formatOklch\(parseColor\("#67bd31"\)!\)\)\.toMatch\($/,
  },
  // Container-internal Postgres port in the compose example's DATABASE_URL.
  {
    file: /^docker-compose\.yml$/,
    line: /^# {5}DATABASE_URL {8}postgres:\/\/cp:<POSTGRES_PASSWORD>@cleaning-partners-db:5432\/cp$/,
  },
]
// Lines where "Security Partners" is CP content (group companies, team bio).
const LINE_ALLOW = [
  /sister company to Security Partners/,
  /name:\s*"Security Partners"/,
  /securitypartnersltd\.ie/,
]
const LOGO_PATH = /\/images\/home\/security-partners\.png/
const SP_NAME = /Security Partners/

const BINARY_EXT = /\.(png|jpe?g|webp|avif|ico|svg|woff2?|lottie)$/i

function skipFile(file: string): boolean {
  if (BINARY_EXT.test(file)) return true
  if (/^tests\/fixtures\/.*\.json$/.test(file)) return true
  return file === "pnpm-lock.yaml"
}

// Compose / CI files may publish "host:container" port mappings. Only the
// host side is a dev endpoint, so drop the container side before matching.
const PORT_MAP_FILE =
  /^(docker-compose[^/]*\.ya?ml|\.github\/workflows\/[^/]+\.ya?ml)$/
const PORT_MAP = /"((?:\d+\.\d+\.\d+\.\d+:)?\d+):\d+"/g

function maskContainerPorts(line: string, file: string): string {
  return PORT_MAP_FILE.test(file) ? line.replace(PORT_MAP, '"h:$1"') : line
}

export function findHits(
  text: string,
  file = ""
): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = []
  text.split("\n").forEach((line, i) => {
    if (
      FILE_LINE_ALLOW.some((a) => a.file.test(file) && a.line.test(line.trim()))
    )
      return
    const lineAllowed = LINE_ALLOW.some((re) => re.test(line))
    const scanned = maskContainerPorts(line, file)
    for (const re of FORBIDDEN) {
      if (!re.test(scanned)) continue
      // A LINE_ALLOW match excuses only the sister-company name; the logo
      // path (sister company's logo, CP content) excuses only security-partners.
      if (lineAllowed && re.source === SP_NAME.source) continue
      if (LOGO_PATH.test(line) && re.source === "security-partners") continue
      hits.push({ line: i + 1, text: line.trim() })
      break
    }
  })
  return hits
}

function trackedFiles(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "-co", "--exclude-standard"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }
  )
  return out.split("\0").filter(Boolean)
}

describe("branding gate", () => {
  it("has no Security Partners identifiers outside the allowlist", () => {
    const failures: string[] = []
    for (const file of trackedFiles()) {
      if (skipFile(file) || FILE_ALLOW.some((re) => re.test(file))) continue
      let text: string
      try {
        text = readFileSync(file, "utf8")
      } catch {
        continue // deleted in the working tree
      }
      if (text.includes("\0")) continue
      for (const hit of findHits(text, file))
        failures.push(`${file}:${hit.line}: ${hit.text}`)
    }
    expect(failures, failures.join("\n")).toEqual([])
  })

  it("tests/e2e and tests/dom carry no security-industry fixture wording", () => {
    const SECURITY_WORDING = /patrol|guards? briefing|night-supervisor/i
    const failures: string[] = []
    for (const file of trackedFiles()) {
      if (!/^tests\/(e2e|dom)\//.test(file)) continue
      let text: string
      try {
        text = readFileSync(file, "utf8")
      } catch {
        continue
      }
      text.split("\n").forEach((line, i) => {
        if (SECURITY_WORDING.test(line)) failures.push(`${file}:${i + 1}`)
      })
    }
    expect(failures, failures.join("\n")).toEqual([])
  })

  it("matcher flags a forbidden domain in an inline fixture", () => {
    const hits = findHits(
      "see https://securitypartnersltd.com/contact\nok line"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0].line).toBe(1)
  })

  it("flags each new SP pattern", () => {
    for (const line of [
      "const k = process.env.SP_ADMIN_LIGHT",
      'import x from "sp-core"',
      "host sp.example",
      "const spFoo = 1",
      'cookie: "sp"',
      'salt: "sp/"',
      "//sp:thing",
    ])
      expect(findHits(line), line).toHaveLength(1)
  })

  it("LINE_ALLOW does not excuse a forbidden domain on the same line", () => {
    const hits = findHits(
      "sister company to Security Partners, see securitypartnersltd.com"
    )
    expect(hits).toHaveLength(1)
  })

  it("logo allowance does not excuse another forbidden token", () => {
    const line =
      '<img src="/images/home/security-partners.png" data-x="SP_ADMIN_LIGHT">'
    expect(findHits(line)).toHaveLength(1)
    expect(
      findHits('<img src="/images/home/security-partners.png">')
    ).toHaveLength(0)
  })

  it("FILE_LINE_ALLOW covers only the SP salt line in crypto.test.ts", () => {
    const salt = 'const FOREIGN_SALT = "sp/v1"'
    expect(findHits(salt, "tests/unit/crypto.test.ts")).toHaveLength(0)
    expect(findHits(salt, "tests/unit/other.test.ts")).toHaveLength(1)
    expect(findHits('x = "sp/v1"', "tests/unit/crypto.test.ts")).toHaveLength(1)
  })

  it("flags SP dev ports in code but not container-side mappings", () => {
    for (const line of [
      "  port: 1025,",
      'const u = "http://127.0.0.1:8025"',
      "BETTER_AUTH_URL=http://localhost:3100",
      "postgres://cp:cp@127.0.0.1:5432/cp",
      "postgres://cp:cp@localhost:5433/cp",
    ])
      expect(findHits(line, "server/lib/mailer.ts"), line).toHaveLength(1)
    const compose = "docker-compose.dev.yml"
    expect(findHits('      - "127.0.0.1:1026:1025"', compose)).toHaveLength(0)
    expect(findHits('      - "127.0.0.1:5434:5432"', compose)).toHaveLength(0)
    expect(
      findHits('    ports: ["5434:5432"]', ".github/workflows/ci.yml")
    ).toHaveLength(0)
    // Host side on an SP port is still refused.
    expect(findHits('      - "127.0.0.1:1025:1025"', compose)).toHaveLength(1)
    expect(findHits('      - "5433:5432"', compose)).toHaveLength(1)
    expect(findHits('      - "8025:8025"', compose)).toHaveLength(1)
    // The mapping allowance does not extend to other files.
    expect(findHits('x = "1026:1025"', "server/lib/mailer.ts")).toHaveLength(1)
  })

  it("flags SP palette hexes case-insensitively", () => {
    for (const hex of ["#367318", "#67BD31", "#7cc84a", "#0D1B36", "#EEF6E8"])
      expect(findHits(`primary: "${hex}"`, "lib/x.ts"), hex).toHaveLength(1)
    expect(findHits('primary: "#15803d"', "lib/x.ts")).toHaveLength(0)
  })

  it("palette allowance covers only the colour-math line", () => {
    const line = '    expect(formatOklch(parseColor("#67bd31")!)).toMatch('
    const file = "tests/unit/theme/color.test.ts"
    expect(findHits(line, file)).toHaveLength(0)
    expect(findHits(line, "tests/unit/other.test.ts")).toHaveLength(1)
    expect(findHits('x = "#67bd31"', file)).toHaveLength(1)
  })
})
