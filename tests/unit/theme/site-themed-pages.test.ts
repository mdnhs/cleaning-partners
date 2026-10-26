import { globSync, readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

/**
 * Every public page wraps its request-time content in
 * SiteThemed, so the published brand overrides paint with (never after) the
 * content. A page with a bare `<Suspense>` would flash the default colours.
 * CP has no catch-all page, so none is exempt.
 */
const ROOT = "app/(site)"
const pages = globSync(`${ROOT}/**/page.tsx`).sort()

/** Source with comments stripped, so a commented-out wrapper never counts. */
function source(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
}

describe("public pages use SiteThemed", () => {
  it("finds the public pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(9)
  })

  it.each(pages)("%s renders inside SiteThemed", (file) => {
    const src = source(file)
    expect(src).toMatch(
      /import \{ SiteThemed \} from "@\/components\/site-themed"/
    )
    expect(src).toMatch(/<SiteThemed>/)
    expect(src, "no bare page-level Suspense").not.toMatch(/<Suspense\b/)
  })
})
