import { describe, expect, it } from "vitest"

import { isBuilderSlug } from "@/lib/builder-slug"

// The equivalence with the `builderSlug` schema (lib/schemas/api/builder-pages)
// is asserted once that schema lands; until then the expected outcomes are
// listed here.
describe("isBuilderSlug (zod-free, proxy)", () => {
  it.each<[string, boolean]>([
    ["landing", true],
    ["spring-offer-2026", true],
    ["a", true],
    ["x".repeat(60), true],
    ["x".repeat(61), false],
    ["", false],
    ["Landing", false],
    ["a--b", false],
    ["a-", false],
    ["-a", false],
    ["a/b", false],
    ["é", false],
    [" a", false],
    ["a\nb", false],
    ["landing\n", false],
    ["admin", false],
    ["api", false],
    ["og", false],
    ["images", false],
    ["p", false],
  ])("%j -> %s", (slug, expected) => {
    expect(isBuilderSlug(slug)).toBe(expected)
  })
})
