import { describe, expect, it } from "vitest"

import { seo } from "@/lib/schemas/common"
import { articleSchema } from "@/lib/schemas/content/article"
import { categorySchema } from "@/lib/schemas/content/category"
import { clientSchema } from "@/lib/schemas/content/client"
import { groupCompanySchema } from "@/lib/schemas/content/group-company"
import { serviceSchema } from "@/lib/schemas/content/service"
import { teamMemberSchema } from "@/lib/schemas/content/team-member"
import { testimonialSchema } from "@/lib/schemas/content/testimonial"
import { settingsSchemas, type SettingsKey } from "@/lib/schemas/settings"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { PAGE_KEYS, PAGES, templates } from "@/templates/registry"

import { inventory, normalise } from "../helpers/inventory"
import { schemaPaths } from "../helpers/schema-paths"

/** Inventory field paths under `prefix` (prefix stripped), minus collection markers. */
function inventoryPaths(prefix: string): Set<string> {
  return new Set(
    inventory
      .map((e) => normalise(e.target))
      .filter((t) => t.startsWith(prefix) && !t.endsWith("[].*"))
      .map((t) => t.slice(prefix.length))
  )
}

/**
 * CP's derived inventory entries: values the site computes or reads from a
 * column instead of storing in the schema.
 */
const DERIVED: Record<string, string[]> = {
  // Four lines composed from contact.addressLine1, footer.addressLine2,
  // footer.contactOfficeLine and contact.email (Task 1).
  "settings.footer.": ["contactLines"],
  // publishedAt / readTimeMinutes / categoryId are columns; the byline
  // comes from the author row; the baseline body blocks are one TipTap
  // `body` document (the schema's `body` leaf).
  "articles[].": [
    "date",
    "displayDate",
    "readTime",
    "category",
    "body[].type",
    "body[].text",
    "body[].cite",
    "body[].items",
    "body[].items[]",
  ],
}

/** Template-page fields that are structure, not copy, so the inventory has no entry. */
const STRUCTURAL_PAGE_LEAVES = new Set([
  "blog.count", // posts shown on the home strip (seeded 3)
  "pageSize", // blog posts per page (seeded 6)
  "featuredArticle", // slug picker; null = newest
])

function expectInventoryCovered(
  prefix: string,
  paths: ReturnType<typeof schemaPaths>
) {
  const known = new Set([
    ...paths.leaves,
    ...paths.lists,
    ...(DERIVED[prefix] ?? []),
  ])
  // A paragraphsText / richText leaf stands for its list of paragraphs:
  // "overview" also covers the inventory's "overview[]".
  const missing = [...inventoryPaths(prefix)].filter(
    (p) => !known.has(p) && !(p.endsWith("[]") && known.has(p.slice(0, -2)))
  )
  expect(
    missing,
    `inventory fields under ${prefix} with no schema field`
  ).toEqual([])
}

describe("template schemas match docs/brief-inventory.json (master Task 3.2)", () => {
  const fixture = pagesFixture(fixtureMediaLookup)

  it("registry maps the seven pages to six templates (no team page)", () => {
    expect(PAGE_KEYS).toEqual([
      "home",
      "about",
      "services",
      "blog",
      "contact",
      "privacy",
      "terms",
    ])
    expect(Object.keys(templates).sort()).toEqual([
      "about",
      "blog",
      "contact",
      "home",
      "legal",
      "services",
    ])
  })

  it.each(PAGE_KEYS)(
    "pages.%s fixture parses and round-trips unchanged",
    (key) => {
      const schema = templates[PAGES[key]].schema
      expect(schema.parse(fixture[key].data)).toEqual(fixture[key].data)
      expect(seo.parse(fixture[key].seo)).toEqual(fixture[key].seo)
    }
  )

  it.each(["home", "about", "services", "blog", "contact"] as const)(
    "pages.%s: schema leaf paths equal the inventory's fields",
    (key) => {
      const prefix = `pages.${key}.`
      const wanted = new Set(
        [...inventoryPaths(prefix)].filter((p) => !p.startsWith("seo."))
      )
      const paths = schemaPaths(templates[PAGES[key]].schema)
      // every inventory field exists in the schema (a rich-text leaf covers
      // its "[]" item entries) …
      expect(
        [...wanted].filter(
          (p) =>
            !paths.leaves.has(p) &&
            !paths.lists.has(p) &&
            !(p.endsWith("[]") && paths.leaves.has(p.slice(0, -2)))
        )
      ).toEqual([])
      // … and every schema leaf is in the inventory (a list of strings may
      // be recorded as the list itself, e.g. "sectors")
      expect(
        [...paths.leaves].filter(
          (p) =>
            !wanted.has(p) &&
            !(p.endsWith("[]") && wanted.has(p.slice(0, -2))) &&
            !STRUCTURAL_PAGE_LEAVES.has(p)
        )
      ).toEqual([])
    }
  )

  it("page seo.* fields map onto the seo column schema", () => {
    const seoPaths = schemaPaths(seo).leaves
    const seoFields = inventory
      .map((e) => e.target)
      .filter((t) => /^pages\.\w+\.seo\./.test(t))
      .map((t) => t.replace(/^pages\.\w+\.seo\./, ""))
    expect(seoFields.length).toBeGreaterThan(0)
    expect(seoFields.filter((f) => !seoPaths.has(f))).toEqual([])
  })

  it("legal pages are new (spec §5.2) and absent from the inventory", () => {
    expect(inventoryPaths("pages.privacy.").size).toBe(0)
    expect(inventoryPaths("pages.terms.").size).toBe(0)
  })

  it("every pages.* target names a registry page", () => {
    const unknown = inventory
      .map((e) => e.target)
      .filter((t) => t.startsWith("pages."))
      .filter((t) => !PAGE_KEYS.some((k) => t.startsWith(`pages.${k}.`)))
    expect(unknown).toEqual([])
  })
})

describe("settings and collection schemas cover the inventory", () => {
  const settingsKeys = Object.keys(settingsSchemas) as SettingsKey[]

  it("every settings.* target names a known settings key", () => {
    const unknown = inventory
      .map((e) => e.target)
      .filter((t) => t.startsWith("settings."))
      .filter((t) => !settingsKeys.some((k) => t.startsWith(`settings.${k}.`)))
    expect(unknown).toEqual([])
  })

  it.each(settingsKeys)("settings.%s", (key) => {
    expectInventoryCovered(
      `settings.${key}.`,
      schemaPaths(settingsSchemas[key])
    )
  })

  it("every DERIVED entry is a real inventory target (no stale exemptions)", () => {
    const stale = Object.entries(DERIVED).flatMap(([prefix, names]) =>
      names.filter((n) => !inventoryPaths(prefix).has(n)).map((n) => prefix + n)
    )
    expect(stale).toEqual([])
  })

  it("settings.footer.contactLines is the only derived settings path", () => {
    const derived = Object.entries(DERIVED)
      .filter(([prefix]) => prefix.startsWith("settings."))
      .flatMap(([prefix, names]) => names.map((n) => `${prefix}${n}`))
    expect(derived).toEqual(["settings.footer.contactLines"])
  })

  it.each([
    ["services[].", serviceSchema],
    ["articles[].", articleSchema],
    ["categories[].", categorySchema],
    ["team[].", teamMemberSchema],
    ["clients[].", clientSchema],
    ["groupCompanies[].", groupCompanySchema],
    ["testimonials[].", testimonialSchema],
  ] as const)("%s", (prefix, schema) => {
    expect(inventoryPaths(prefix).size).toBeGreaterThan(0)
    expectInventoryCovered(prefix, schemaPaths(schema))
  })

  it("services[].overview is one paragraphsText leaf (and overview[] is covered by it)", () => {
    const paths = schemaPaths(serviceSchema)
    expect(paths.leaves.has("overview")).toBe(true)
    expect(paths.leaves.has("overview[]")).toBe(false)
    expect(inventoryPaths("services[].").has("overview[]")).toBe(true)
  })

  it("every inventory root is checked", () => {
    const roots = new Set(
      inventory.map((e) => normalise(e.target).split(/[.[]/)[0])
    )
    expect([...roots].sort()).toEqual([
      "articles",
      "categories",
      "clients",
      "groupCompanies",
      "pages",
      "services",
      "settings",
      "team",
      "testimonials",
    ])
  })

  it("template entries sharing a target have equal seeds", () => {
    const seeds = new Map<string, Set<string>>()
    // List items ("lines[]") legitimately differ: one entry per item.
    for (const e of inventory.filter(
      (x) => x.template && x.seed && !x.target.endsWith("[]")
    ))
      seeds.set(
        e.target,
        (seeds.get(e.target) ?? new Set()).add(e.seed as string)
      )
    expect([...seeds].filter(([, set]) => set.size > 1)).toEqual([])
    expect(seeds.size).toBeGreaterThan(5)
  })
})
