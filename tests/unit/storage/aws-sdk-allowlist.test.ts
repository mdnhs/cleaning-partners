import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../../..")
const SKIP = new Set([
  "node_modules",
  ".next",
  "dist",
  "tests",
  "docs",
  ".superpowers",
  "coverage",
  ".git",
])

/**
 * Files allowed to touch the AWS SDK S3 packages. Later files (the backup
 * store in 11.1, the migrate job in 6.4) must be added here explicitly, after
 * review of how they confine keys to cp/.
 */
const ALLOWED = new Set([
  "server/lib/r2-client.ts",
  "server/lib/storage/r2.ts",
  "server/modules/integrations/testers.ts",
])

const PKG = String.raw`@aws-sdk/(?:client-s3|lib-storage|s3-request-presigner)`
const IMPORT_RE = new RegExp(
  String.raw`(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']${PKG}["']`
)

export function importsAwsSdk(text: string): boolean {
  return IMPORT_RE.test(text)
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|mts|cts|js|mjs)$/.test(name)) out.push(full)
  }
  return out
}

describe("AWS SDK S3 imports are allowlisted", () => {
  it("only the allowlisted files import the S3 SDK packages", () => {
    const found = walk(ROOT)
      .map((f) => path.relative(ROOT, f))
      .filter((f) => importsAwsSdk(readFileSync(path.join(ROOT, f), "utf8")))
      .sort()
    expect(found).toEqual([...ALLOWED].sort())
  })

  it("the matcher catches every import form", () => {
    for (const code of [
      'import * as s3 from "@aws-sdk/client-s3"',
      'import { X as Y } from "@aws-sdk/client-s3"',
      'import type { S3Client } from "@aws-sdk/client-s3"',
      'const m = await import("@aws-sdk/client-s3")',
      'const m = require("@aws-sdk/lib-storage")',
      "import {\n  a,\n} from '@aws-sdk/s3-request-presigner'",
      'import "@aws-sdk/client-s3"',
    ])
      expect(importsAwsSdk(code), code).toBe(true)
    expect(importsAwsSdk('import x from "@aws-sdk/types"')).toBe(false)
  })
})
