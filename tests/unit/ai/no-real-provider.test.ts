import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

describe("no test calls a real AI provider (R9-17)", () => {
  it("no test file imports an @ai-sdk provider package", () => {
    const self = join(__dirname, "no-real-provider.test.ts")
    const offenders = walk(join(process.cwd(), "tests"))
      .filter((file) => /\.(test|spec)?\.?[jt]sx?$/.test(file) && file !== self)
      .filter((file) =>
        /from\s+["']@ai-sdk\/|import\(\s*["']@ai-sdk\//.test(
          readFileSync(file, "utf8")
        )
      )
    expect(offenders).toEqual([])
  })
})
