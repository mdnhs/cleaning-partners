import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

// A shallow lint, not a proof: it only catches a string literal that names
// an @ai-sdk provider package (import, require, dynamic import, side-effect
// import, template literal, vi.importActual). Tests must also never call
// generateText or streamText on a non-mock provider; they use
// MockLanguageModelV4 from "ai/test" and injected fetches only.
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/
const PROVIDER_PACKAGE = /["'`]@ai-sdk\//

describe("no test calls a real AI provider (R9-17)", () => {
  it("no test file names an @ai-sdk provider package", () => {
    const self = join(__dirname, "no-real-provider.test.ts")
    const offenders = walk(join(process.cwd(), "tests"))
      .filter((file) => SOURCE_FILE.test(file) && file !== self)
      .filter((file) => PROVIDER_PACKAGE.test(readFileSync(file, "utf8")))
    expect(offenders).toEqual([])
  })
})
