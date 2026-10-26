import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../../..")
const SCAN_DIRS = ["server", "scripts"]
const SKIP_DIRS = new Set(["dist", "node_modules", ".next"])

/** S3 commands that carry a Key or Prefix. HeadBucket and ListBuckets carry none and are exempt. */
const KEYED =
  /\bnew\s+(?:PutObject|GetObject|HeadObject|DeleteObject|DeleteObjects|ListObjects|ListObjectsV2|ListObjectVersions|ListMultipartUploads|ListParts|CopyObject|CreateMultipartUpload|UploadPart|UploadPartCopy|CompleteMultipartUpload|AbortMultipartUpload|PutObjectAcl|GetObjectAcl|RestoreObject|SelectObjectContent)Command\b/
const ROUTES_THROUGH_KEY_FN =
  /import\s*\{[^}]*\br2ObjectKey\b[^}]*\}\s*from\s*["']@\/server\/lib\/r2-client["']|\bexport function r2ObjectKey\b/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(full)
  }
  return out
}

/** Offenders: files with a keyed command that do not import and use r2ObjectKey. */
export function offenders(files: Map<string, string>): string[] {
  const bad: string[] = []
  for (const [file, text] of files) {
    if (!KEYED.test(text)) continue
    const uses = (text.match(/\br2ObjectKey\s*\(/g) ?? []).length
    if (!ROUTES_THROUGH_KEY_FN.test(text) || uses === 0) bad.push(file)
  }
  return bad
}

describe("R6-1 grep guard: no keyed S3 command outside r2ObjectKey", () => {
  const files = new Map<string, string>()
  for (const dir of SCAN_DIRS)
    for (const f of walk(path.join(ROOT, dir)))
      files.set(path.relative(ROOT, f), readFileSync(f, "utf8"))

  it("scans the real tree and finds the driver as a keyed-command user", () => {
    const users = [...files].filter(([, t]) => KEYED.test(t)).map(([f]) => f)
    expect(users).toContain("server/lib/storage/r2.ts")
  })

  it("every file constructing a keyed S3 command routes through r2ObjectKey", () => {
    expect(offenders(files)).toEqual([])
  })

  it("catches each keyed command when r2ObjectKey is missing", () => {
    for (const cmd of [
      "PutObject",
      "GetObject",
      "HeadObject",
      "DeleteObject",
      "DeleteObjects",
      "ListObjectsV2",
      "ListObjects",
      "CopyObject",
      "CreateMultipartUpload",
      "UploadPart",
      "CompleteMultipartUpload",
    ])
      expect(
        offenders(
          new Map([["x.ts", `client.send(new ${cmd}Command({ Key: "k" }))`]])
        ),
        cmd
      ).toEqual(["x.ts"])
  })

  it("passes a file that imports and calls r2ObjectKey, and exempts HeadBucket/ListBuckets", () => {
    const ok = `import { r2ObjectKey } from "@/server/lib/r2-client"\nnew PutObjectCommand({ Key: r2ObjectKey(c, k) })`
    expect(offenders(new Map([["ok.ts", ok]]))).toEqual([])
    expect(
      offenders(
        new Map([
          ["h.ts", "new HeadBucketCommand({ Bucket })"],
          ["l.ts", "new ListBucketsCommand({})"],
        ])
      )
    ).toEqual([])
  })

  it("an import without a call is still an offender", () => {
    const lazy = `import { r2ObjectKey } from "@/server/lib/r2-client"\nnew DeleteObjectCommand({ Key: k })`
    expect(offenders(new Map([["lazy.ts", lazy]]))).toEqual(["lazy.ts"])
  })

  it("only the client module builds an S3 client", () => {
    // S3Client construction belongs to r2-client.ts (and test stubs only).
    const builders = [...files]
      .filter(([, t]) => /\bnew\s+S3Client\s*\(/.test(t))
      .map(([f]) => f)
    expect(builders).toEqual(["server/lib/r2-client.ts"])
  })
})
