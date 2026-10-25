import { describe, expect, it } from "vitest"

import { PAGE_KEYS, PAGES, templates } from "@/templates/registry"
import {
  fixtureMediaKey,
  fixtureMediaLookup,
  MEDIA,
} from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"

import { frozenArray } from "../helpers/frozen"
import { inventory, normalise } from "../helpers/inventory"

const fixture = pagesFixture(fixtureMediaLookup)

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

describe("page fixtures (master 3.2)", () => {
  it.each(PAGE_KEYS)("pages.%s parses against its template", (key) => {
    const result = templates[PAGES[key]].schema.safeParse(fixture[key].data)
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true)
  })

  const entries = inventory
    .map((e) => ({ ...e, path: normalise(e.target) }))
    .filter((e) => e.path.startsWith("pages."))

  it("checks every pages.* inventory entry", () => {
    expect(entries.length).toBe(144)
  })

  it.each(entries.map((e) => [e.id, e] as const))(
    "%s is verbatim",
    (_id, e) => {
      const [, key, ...rest] = e.path.split(".")
      const pageKey = key as keyof typeof fixture
      const isSeo = rest[0] === "seo"
      const root = isSeo ? fixture[pageKey].seo : fixture[pageKey].data
      const path = (isSeo ? rest.slice(1) : rest).join(".")
      const found = valuesAt(root, path)
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
    expect(fixture.services.data.detail.officeHours.hours).toBe(
      "Mon – Fri: 9am – 6pm"
    )
    expect(fixture.contact.data.quoteForm.fields.service.extraOption1).toBe(
      "Domestic Cleaning"
    )
    expect(fixture.contact.data.quoteForm.fields.service.extraOption2).toBe(
      "Other"
    )
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
      expect(fixture.about.data.stats).toEqual(
        frozenArray("components/about/stats.tsx", "stats")
      )
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

    it("home service items", () => {
      expect(fixture.home.data.services.items).toEqual(
        frozenArray("components/home/services.tsx", "services")
      )
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

  it("about and contact heroes have no own image; services, blog and legal do", () => {
    expect("image" in fixture.about.data.hero).toBe(false)
    expect("image" in fixture.contact.data.hero).toBe(false)
    expect(fixture.services.data.hero.image).toBeDefined()
    expect(fixture.blog.data.hero.image).toBeDefined()
    expect(fixture.privacy.data.hero.image).toBeDefined()
  })

  it("home has no seo override; the four inner pages carry theirs", () => {
    expect(fixture.home.seo).toEqual({})
    for (const key of ["about", "services", "blog", "contact"] as const)
      expect(fixture[key].seo.title).toMatch(/\| Cleaning Partners Ltd\.$/)
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

  it("legal pages are CP's own, with distinct titles and a body", () => {
    expect(fixture.privacy.data.hero.title).toBe("Privacy Policy")
    expect(fixture.terms.data.hero.title).toBe("Terms and Conditions")
    for (const key of ["privacy", "terms"] as const) {
      expect(fixture[key].data.body.content.length).toBeGreaterThan(3)
      expect(JSON.stringify(fixture[key].data)).toContain("Cleaning Partners")
    }
  })
})
