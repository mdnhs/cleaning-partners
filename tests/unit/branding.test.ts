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
    for (const re of FORBIDDEN) {
      if (!re.test(line)) continue
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
})
