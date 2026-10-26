import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe("public content comes from the content model (master Task 3.4)", () => {
  it("the static data modules are gone", () => {
    for (const file of ["lib/services.ts", "lib/blog-posts.ts"])
      expect(existsSync(file), file).toBe(false)
  })

  it("nothing imports a static data module", () => {
    const offenders = [
      ...walk("app"),
      ...walk("components"),
      ...walk("templates"),
      ...walk("lib"),
      ...walk("server"),
    ].filter((file) =>
      /from "(?:@\/lib\/(?:services|blog-posts)|[^"]*\/data)"/.test(
        readFileSync(file, "utf8")
      )
    )
    expect(offenders).toEqual([])
  })

  it("the public pages load their data through loadSiteSources", () => {
    const pages = walk("app/(site)").filter((f) => f.endsWith("page.tsx"))
    expect(pages).toHaveLength(10)
    for (const page of pages)
      expect(readFileSync(page, "utf8"), page).toContain("loadSiteSources")
  })
})
