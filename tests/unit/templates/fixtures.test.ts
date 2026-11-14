import { describe, expect, it } from "vitest"

import { RICH_TEXT_MAX_CHARS, RICH_TEXT_MAX_NODES } from "@/blocks/registry"

import { contactPlaceholders, interpolate } from "@/lib/interpolate"
import { seo } from "@/lib/schemas/common"
import { settingsSchemas, type SettingsKey } from "@/lib/schemas/settings"
import { PAGE_KEYS, PAGES, templates } from "@/templates/registry"
import {
  fixtureMediaKey,
  fixtureMediaLookup,
  MEDIA,
} from "@/server/db/seed/fixtures/media"
import { legalPagesFixture } from "@/server/db/seed/fixtures/legal-pages"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { servicesFixture } from "@/server/db/seed/fixtures/services"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

import { frozenArray } from "../helpers/frozen"
import {
  CHANGED_SINCE_BASELINE,
  currentTarget,
  expectChangedSinceBaseline,
  inventory,
  normalise,
  RELOCATED_SINCE_BASELINE,
} from "../helpers/inventory"
import { schemaPaths } from "../helpers/schema-paths"

const fixture = pagesFixture(fixtureMediaLookup)
const settings = settingsFixture(fixtureMediaLookup)
/** {placeholders} (phone24h …) as the views fill them in. */
const fill = (text: string) =>
  interpolate(text, contactPlaceholders(settings.contact))

/** A paragraphsText doc as its paragraphs' plain text (the inventory lists them one by one). */
function paragraphTexts(value: unknown): unknown {
  const node = value as { type?: string; content?: unknown[] } | undefined
  if (node?.type !== "doc" || !Array.isArray(node.content)) return value
  return node.content.map((p) =>
    ((p as { content?: { text?: string }[] }).content ?? [])
      .map((t) => t.text ?? "")
      .join("")
  )
}

/** Values at a dotted path with "[]" fan-out; media refs become their key. */
function valuesAt(root: unknown, path: string): unknown[] {
  let current: unknown[] = [root]
  for (const segment of path.split(".")) {
    const [name, ...brackets] = segment.split("[]")
    current = current.flatMap((node) => {
      let next: unknown[] = [
        name === ""
          ? node
          : paragraphTexts(
              (node as Record<string, unknown> | undefined)?.[name]
            ),
      ]
      for (let i = 0; i < brackets.length; i++)
        next = next.flatMap((n) => (Array.isArray(n) ? n : []))
      return next
    })
  }
  return current.map((v) =>
    v && typeof v === "object" && "mediaId" in v
      ? fixtureMediaKey((v as { mediaId: string }).mediaId)
      : v
  )
}

/** Every { mediaId } in a value. */
function mediaIds(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) mediaIds(v, out)
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.mediaId === "string") out.add(record.mediaId)
    for (const v of Object.values(record)) mediaIds(v, out)
  }
  return out
}

/**
 * Seeded values at a "pages.<key>.…" path, read from the page's `seo` column
 * for "pages.<key>.seo.…" and from its template data otherwise.
 */
function seededValue(path: string): unknown[] {
  const [, key, ...rest] = path.split(".")
  const page = fixture[key as keyof typeof fixture]
  const isSeo = rest[0] === "seo"
  return valuesAt(
    isSeo ? page.seo : page.data,
    (isSeo ? rest.slice(1) : rest).join(".")
  )
}

/** The schema paths a "pages.…" or "settings.…" target lives under. */
function livePaths(target: string): { rest: string; paths: Set<string> } {
  const [root, key, ...rest] = target.split(".")
  if (root === "pages" && !Object.hasOwn(PAGES, key))
    throw new Error(`${target}: "${key}" is not a registry page`)
  if (root === "pages" && rest[0] === "seo") {
    const p = schemaPaths(seo)
    return {
      rest: rest.slice(1).join("."),
      paths: new Set([...p.leaves, ...p.lists]),
    }
  }
  if (root === "pages") {
    const p = schemaPaths(templates[PAGES[key as keyof typeof PAGES]].schema)
    return { rest: rest.join("."), paths: new Set([...p.leaves, ...p.lists]) }
  }
  if (root === "settings") {
    const settingsKey = (Object.keys(settingsSchemas) as SettingsKey[])
      .filter((k) => target.startsWith(`settings.${k}.`))
      .sort((a, b) => b.length - a.length)[0]
    if (settingsKey) {
      const p = schemaPaths(settingsSchemas[settingsKey])
      return {
        rest: target.slice(`settings.${settingsKey}.`.length),
        paths: new Set([...p.leaves, ...p.lists]),
      }
    }
  }
  throw new Error(`${target}: not a pages.* or settings.* path`)
}

describe("page fixtures (master 3.2)", () => {
  it.each(PAGE_KEYS)("pages.%s parses against its template", (key) => {
    const result = templates[PAGES[key]].schema.safeParse(fixture[key].data)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  const entries = inventory
    .map((e) => ({ ...e, path: currentTarget(e.target) }))
    .filter((e): e is typeof e & { path: string } =>
      Boolean(e.path?.startsWith("pages."))
    )

  it("checks every pages.* inventory entry", () => {
    expect(
      inventory.filter((e) => normalise(e.target).startsWith("pages.")).length
    ).toBe(144)
  })

  /** The seeded value (placeholders filled unless it is a template) a changed entry must differ from. */
  const changedValue = (e: (typeof entries)[number]) => {
    const actual = seededValue(e.path)[0]
    return !e.template && typeof actual === "string" ? fill(actual) : actual
  }

  it("every baseline-change exemption is a real inventory entry (no stale entries)", () => {
    for (const id of CHANGED_SINCE_BASELINE.keys()) {
      const entry = inventory.find((e) => e.id === id)
      expect(entry, id).toBeDefined()
      // A removed field (relocated to null) cannot have a changed value.
      const target = currentTarget(entry!.target)
      expect(target, `${id}: relocated to null`).not.toBeNull()
      expect(target, id).toMatch(/^(pages|settings)\./)
    }
  })

  it("every baseline-change exemption still has a seeded value at its (possibly relocated) path", () => {
    const changed = entries.filter((e) => CHANGED_SINCE_BASELINE.has(e.id))
    // Guards against a vacuous pass: both seeded exemptions target pages.*,
    // so an empty list means the filter (or currentTarget) broke.
    expect(changed.length).toBeGreaterThan(0)
    for (const e of changed) expectChangedSinceBaseline(e, changedValue(e))
  })

  it("every relocation names a real inventory target and a live schema path", () => {
    const targets = new Set(inventory.map((e) => normalise(e.target)))
    for (const [from, to] of Object.entries(RELOCATED_SINCE_BASELINE)) {
      expect(targets, from).toContain(from)
      if (to === null) continue
      // One hop only: currentTarget does not follow chains.
      expect(
        Object.hasOwn(RELOCATED_SINCE_BASELINE, to),
        `${to}: chained`
      ).toBe(false)
      const { rest, paths } = livePaths(to)
      expect(paths, to).toContain(rest)
    }
  })

  it.each(entries.map((e) => [e.id, e] as const))(
    "%s is verbatim",
    (_id, e) => {
      if (CHANGED_SINCE_BASELINE.has(e.id)) {
        expectChangedSinceBaseline(e, changedValue(e))
        return
      }
      const pageKey = e.path.split(".")[1] as keyof typeof fixture
      let found = seededValue(e.path)
      // A blank seo.title is derived: settings.seo.defaults.titleTemplate
      // applied to the page's hero title (M1).
      if (e.path === `pages.${pageKey}.seo.title` && found[0] === undefined)
        found = [
          interpolate(settings["seo.defaults"].titleTemplate, {
            title: (fixture[pageKey].data as { hero: { title: string } }).hero
              .title,
          }),
        ]
      // Stored text keeps {placeholders}; the inventory has the filled value.
      if (!e.template)
        found = found.map((v) => (typeof v === "string" ? fill(v) : v))
      if (e.array) {
        // "3" = the number of items in the list.
        const list = found[0] as unknown[]
        expect(Array.isArray(list), e.path).toBe(true)
        expect(list).toHaveLength(Number(e.value))
        return
      }
      const expected = e.template ? e.seed : e.value
      expect(found, `${e.path} (${e.source})`).toContain(expected)
    }
  )

  it("seeds the strings the brief singles out exactly", () => {
    expect(fixture.home.data.blog.count).toBe(3)
    expect(fixture.blog.data.pageSize).toBe(6)
    expect(fixture.contact.data.contactTitle).toBe("Ways to Reach Us")
    expect(fixture.services.data.grid.learnMore).toBe("Learn More  →")
    expect(fixture.services.data.detail.officeHours.hours).toBe("{hours}")
    expect(fixture.contact.data.quoteForm.fields.service.extraOptions).toEqual([
      "Domestic Cleaning",
      "Other",
    ])
    expect(fixture.about.data.stats).toHaveLength(4)
    expect(fixture.about.data.story.sectors).toHaveLength(5)
    expect(fixture.contact.data.quoteForm.steps).toHaveLength(3)
    expect(fixture.home.data.services.items).toHaveLength(3)
    expect(fixture.blog.data.article.share.networks).toHaveLength(3)
  })

  // The inventory records only the first item of a list; these compare every
  // item with the static site's own arrays at 3689369.
  describe("every list item equals the static site's", () => {
    it("about stats", () => {
      expect(
        fixture.about.data.stats.map((stat) => ({
          ...stat,
          label: fill(stat.label),
        }))
      ).toEqual(frozenArray("components/about/stats.tsx", "stats"))
    })

    it("about story paragraphs", () => {
      expect(paragraphTexts(fixture.about.data.story.paragraphs)).toEqual(
        frozenArray("components/about/our-story.tsx", "paragraphs")
      )
    })

    it("about story sectors", () => {
      expect(fixture.about.data.story.sectors).toEqual(
        frozenArray("components/about/our-story.tsx", "sectors")
      )
    })

    it("contact next steps", () => {
      expect(fixture.contact.data.quoteForm.steps).toEqual(
        frozenArray("components/contact/quote-form.tsx", "steps")
      )
    })

    // The home list now picks services from the collection (phase 2,
    // task 13): the static site's "Domestic Cleaning" has no service page.
    it("home service items", () => {
      const slugs = servicesFixture(fixtureMediaLookup).map((x) => x.slug)
      const items = fixture.home.data.services.items
      expect(items).toHaveLength(3)
      for (const item of items) expect(slugs).toContain(item.service)
    })

    it("share networks (the url template with {url} for the page address)", () => {
      const frozen = frozenArray<{
        label: string
        name: string
        url: (u: string) => string
      }>("components/blog/share-links.tsx", "networks")
      expect(fixture.blog.data.article.share.networks).toEqual(
        frozen.map((n) => ({ ...n, url: n.url("{url}") }))
      )
    })
  })

  it("about and contact heroes have no own image; services and blog do", () => {
    expect(fixture.about.data.hero.image).toBeNull()
    expect(fixture.contact.data.hero.image).toBeNull()
    expect(fixture.services.data.hero.image).toBeDefined()
    expect(fixture.blog.data.hero.image).toBeDefined()
  })

  it("home has no seo title; the inner pages take theirs from titleTemplate", () => {
    expect(fixture.home.seo).toEqual({})
    for (const key of ["about", "services", "blog", "contact"] as const)
      expect(fixture[key].seo.title).toBeUndefined()
    expect(settings["seo.defaults"].titleTemplate).toBe(
      "{title} | Cleaning Partners Ltd."
    )
  })

  it("uses only library images", () => {
    const used = mediaIds(fixture)
    expect(used.size).toBeGreaterThan(5)
    for (const id of used)
      expect(MEDIA.map((m) => m.key)).toContain(fixtureMediaKey(id))
  })

  it("keeps the reference site's content out", () => {
    const reference = ["Secur", "ity"].join("")
    expect(JSON.stringify(fixture)).not.toMatch(
      new RegExp(`${reference}|${reference.toLowerCase()}partners|\\u2022`, "i")
    )
  })

  it("legal pages are CP's own, with distinct titles and a body that fits one text block", () => {
    const legal = legalPagesFixture(fixtureMediaLookup)
    expect(legal.map((p) => [p.slug, p.title])).toEqual([
      ["privacy", "Privacy Policy"],
      ["terms", "Terms and Conditions"],
    ])
    for (const page of legal) {
      expect(page.body.content.length).toBeGreaterThan(3)
      expect(JSON.stringify(page)).toContain("Cleaning Partners")
      expect(page.body.content.length).toBeLessThanOrEqual(RICH_TEXT_MAX_NODES)
      expect(JSON.stringify(page.body).length).toBeLessThanOrEqual(
        RICH_TEXT_MAX_CHARS
      )
    }
  })
})
