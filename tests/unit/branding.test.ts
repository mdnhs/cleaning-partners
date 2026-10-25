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
  /Security Partners/,
]
// Whole files that may cite SP (the reference repo, or the sister company as content).
const FILE_ALLOW = [
  /^docs\/superpowers\//,
  /^docs\/brief(-inventory\.json|\.md)$/,
  /^tests\/unit\/branding\.test\.ts$/,
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

export function findHits(text: string): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = []
  text.split("\n").forEach((line, i) => {
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
      for (const hit of findHits(text))
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
})
