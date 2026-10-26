import { globSync, readFileSync } from "node:fs"

import { expect, it } from "vitest"

/**
 * B2: SP's "Insights" is "Blog" at /admin/blog/*. No file may link the old
 * /admin/insights path, or name an "insights" route string at all.
 */
const OLD = /["'`(]\/admin\/insights(?:["'`/?)])/
const ROUTE = /["'`]\/?insights(?:["'`/?])/

/** This file, and Help's ban list of other-business words ("insights"). */
const ALLOWED = new Set([
  "tests/unit/no-legacy-links.test.ts",
  "tests/unit/admin/help-topics.test.ts",
])

it("no source file links an /admin/insights path or insights route string", () => {
  const files = [
    ...globSync("{app,components,lib,server,tests}/**/*.{ts,tsx}"),
    ...globSync("{app,components}/**/*.{md,mdx}"),
    "proxy.ts",
  ]
  expect(files.length).toBeGreaterThan(100)
  expect(files).toContain("proxy.ts")
  const hits = files
    .filter((f) => !ALLOWED.has(f) && !f.includes("/migrations/"))
    .filter((f) => {
      const text = readFileSync(f, "utf8")
      return OLD.test(text) || ROUTE.test(text)
    })
  expect(hits).toEqual([])
})

it("the pattern catches the old forms and spares the new ones", () => {
  expect(OLD.test(`href="/admin/insights"`)).toBe(true)
  expect(OLD.test("`/admin/insights/${id}`")).toBe(true)
  expect(OLD.test("[x](/admin/insights)")).toBe(true)
  expect(ROUTE.test(`"insights"`)).toBe(true)
  expect(ROUTE.test(`"/insights/x"`)).toBe(true)
  expect(OLD.test(`"/admin/blog/1"`)).toBe(false)
  expect(ROUTE.test(`"News & insights"`)).toBe(false)
})
