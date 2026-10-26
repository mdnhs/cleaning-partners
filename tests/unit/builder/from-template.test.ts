import { describe, expect, it } from "vitest"

import { validateDocument } from "@/blocks/document"
import { RICH_TEXT_MAX_CHARS, RICH_TEXT_MAX_NODES } from "@/blocks/registry"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import { PAGE_KEYS, type PageKey } from "@/templates/registry"

// What a fixed page stores: media refs are ids, not resolved urls.
const stored = pagesFixture(() => ({
  mediaId: "6f1b7d0e-2c1a-4f4e-9a52-0a5a6a1b3c4d",
}))
const copy = (key: PageKey) =>
  blocksFromTemplate(key, stored[key].data as never)
const types = (key: PageKey) => copy(key).map((b) => b.type)
const anchors = (key: PageKey) => copy(key).map((b) => b.anchor)

describe("blocksFromTemplate (R10-11)", () => {
  it("maps each fixed page's sections in render order", () => {
    expect(types("home")).toEqual([
      "hero",
      "clients",
      "services",
      "whyChooseUs",
      "testimonials",
      "team",
      "blog",
      "contact",
      "map",
    ])
    expect(types("about")).toEqual([
      "hero.page",
      "ourStory",
      "stats",
      "clients",
      "whyChooseUs",
      "team",
      "testimonials",
      "contact",
    ])
    expect(types("services")).toEqual([
      "hero.page",
      "services",
      "whyChooseUs",
      "clients",
      "testimonials",
      "contact",
    ])
    expect(types("contact")).toEqual([
      "hero.page",
      "contact",
      "quoteForm",
      "map",
    ])
    expect(types("privacy")).toEqual(["hero.page", "richtext"])
    expect(types("terms")).toEqual(["hero.page", "richtext"])
    expect(types("blog")).toEqual(["hero.page", "contact"])
  })

  it("copies the page's own text into the blocks", () => {
    const home = stored.home.data
    const [hero, , services, , , , blog] = copy("home")
    expect(hero.data).toEqual(home.hero)
    expect(services.data).toEqual({
      layout: "intro",
      intro: home.services,
      grid: null,
    })
    expect(blog.data).toEqual(home.blog)

    const about = stored.about.data
    const [heroPage, story, stats] = copy("about")
    expect(heroPage.data).toEqual({ ...about.hero, image: null })
    expect(story.data).toEqual(about.story)
    expect(stats.data).toEqual({ items: about.stats })

    const grid = copy("services")[1]
    expect(grid.data).toEqual({
      layout: "grid",
      intro: null,
      grid: stored.services.data.grid,
    })

    const contact = stored.contact.data
    const blocks = copy("contact")
    expect(blocks[0].data).toEqual({ ...contact.hero, image: null })
    expect(blocks[1].data).toEqual({
      useShared: true,
      title: contact.contactTitle,
    })
    expect(copy("privacy")[1].data).toEqual({ doc: stored.privacy.data.body })
    expect(copy("home")[7].data).toEqual({ useShared: true, title: null })
  })

  it("keeps the services page image on a services copy", () => {
    expect(copy("services")[0].data).toEqual(stored.services.data.hero)
  })

  it("uses the owned section ids, else the block's own name", () => {
    expect(anchors("home")).toEqual([
      "hero",
      "clients",
      "services",
      "why-choose-us",
      "testimonials",
      "team",
      "blog",
      "contact",
      "map",
    ])
    expect(anchors("contact")).toEqual(["hero-page", "contact", "quote", "map"])
  })

  it("mints a fresh id per block and never touches the page's data", () => {
    const before = structuredClone(stored.about.data)
    const a = copy("about")
    const b = copy("about")
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length)
    expect(a[0].id).not.toBe(b[0].id)
    expect(a.every((x) => x.hidden === false)).toBe(true)
    expect(stored.about.data).toEqual(before)
    // Mutating a copy leaves the page alone.
    ;(a[2].data as { items: { value: string }[] }).items[0].value = "changed"
    expect(stored.about.data).toEqual(before)
  })

  it.each(PAGE_KEYS)("%s converts to a valid document", (key) => {
    const result = validateDocument({ blocks: copy(key) })
    expect(result.ok ? {} : result.fieldErrors).toEqual({})
  })

  it("fits legal bodies in the rich-text budget", () => {
    for (const key of ["privacy", "terms"] as const) {
      const { doc } = copy(key)[1].data as {
        doc: { content: unknown[] }
      }
      expect(doc.content.length).toBeLessThanOrEqual(RICH_TEXT_MAX_NODES)
      expect(JSON.stringify(doc).length).toBeLessThanOrEqual(
        RICH_TEXT_MAX_CHARS
      )
    }
  })
})
