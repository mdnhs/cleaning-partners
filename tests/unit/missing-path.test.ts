import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { MISSING_PATH } from "@/server/modules/redirects/resolve"

/** Public route patterns under app/(site): "/[slug]", "/blog/[slug]", … */
function sitePatterns(dir = "app/(site)", prefix = ""): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (!statSync(full).isDirectory()) {
      if (name === "page.tsx") out.push(prefix || "/")
      continue
    }
    const segment = /^\(.*\)$/.test(name) ? "" : `/${name}`
    out.push(...sitePatterns(full, prefix + segment))
  }
  return out
}

const matches = (pattern: string, path: string) =>
  new RegExp(
    `^${pattern.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}$`
  ).test(path)

describe("MISSING_PATH (the proxy's rewrite for a real 404)", () => {
  it("matches no public route, so global-not-found answers it with a 404", () => {
    // A route that matched it (the root legal page /[slug]) would render
    // its own notFound() inside a streamed 200.
    const hit = sitePatterns().filter((p) => matches(p, MISSING_PATH))
    expect(hit).toEqual([])
  })
})
