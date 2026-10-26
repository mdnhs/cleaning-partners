import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { validateDocument } from "@/blocks/document"
import {
  Anchor,
  BLOCK_BY_TYPE,
  BLOCK_TYPES,
  BLOCKS,
  BlockId,
  BlockInstance,
  type BlockType,
  RESERVED_ANCHORS,
  RICH_TEXT_MAX_CHARS,
  RICH_TEXT_MAX_NODES,
} from "@/blocks/registry"
import { ArticleBlocks } from "@/lib/rich-text/render"

const TYPES: BlockType[] = [
  "hero",
  "hero.page",
  "ourStory",
  "stats",
  "services",
  "whyChooseUs",
  "clients",
  "team",
  "testimonials",
  "blog",
  "howItWorks",
  "contact",
  "quoteForm",
  "map",
  "richtext",
]

const MEDIA = "0b8a3c4e-1f2d-4a5b-8c6d-7e8f9a0b1c2d"
const link = { label: "Go", href: "/contact" }
const para = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
})

describe("block registry (R10-2)", () => {
  it("BLOCK_TYPES are the 15 CP types in order", () => {
    expect([...BLOCK_TYPES]).toEqual(TYPES)
    expect(BLOCKS.map((b) => b.type)).toEqual(TYPES)
  })

  it("every block has a definition, a unique label and admin copy", () => {
    const labels = BLOCKS.map((b) => b.label)
    expect(new Set(labels).size).toBe(labels.length)
    for (const type of TYPES) {
      const def = BLOCK_BY_TYPE[type]
      expect(def.type).toBe(type)
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(0)
      expect(def.icon).toMatch(/^[A-Z][A-Za-z0-9]+$/)
    }
    expect(BLOCK_BY_TYPE.blog.label).toBe("Blog")
  })

  it("first and max are as tabled", () => {
    expect(BLOCKS.filter((b) => b.first).map((b) => b.type)).toEqual([
      "hero",
      "hero.page",
    ])
    const max = (b: (typeof BLOCKS)[number]) => ("max" in b ? b.max : undefined)
    expect(BLOCKS.filter((b) => max(b) === 1).map((b) => b.type)).toEqual(
      TYPES.filter((t) => !["ourStory", "stats", "richtext"].includes(t))
    )
    expect(
      BLOCKS.filter((b) => max(b) === undefined).map((b) => b.type)
    ).toEqual(["ourStory", "stats", "richtext"])
  })

  it("RESERVED_ANCHORS are CP's", () => {
    expect(RESERVED_ANCHORS).toEqual({
      services: "services",
      team: "team",
      blog: "blog",
      contact: "contact",
      quote: "quoteForm",
    })
  })

  it("BlockId and Anchor patterns", () => {
    expect(BlockId.safeParse(crypto.randomUUID()).success).toBe(true)
    expect(BlockId.safeParse("abc").success).toBe(false)
    expect(Anchor.safeParse("stats-2").success).toBe(true)
    expect(Anchor.safeParse("a".repeat(41)).success).toBe(false)
    expect(Anchor.safeParse("2stats").success).toBe(false)
    expect(Anchor.safeParse("Stats").success).toBe(false)
  })

  it("reuses the fixed pages' schemas verbatim", () => {
    const stats = BLOCK_BY_TYPE.stats.schema
    expect(
      stats.safeParse({ items: [{ value: "24/7", label: "Cover" }] }).success
    ).toBe(true)
    expect(stats.safeParse({ items: [] }).success).toBe(false)

    const blog = (count: number) =>
      BLOCK_BY_TYPE.blog.schema.safeParse({
        eyebrow: "News",
        title: "Latest",
        description: "Read",
        count,
      }).success
    expect(blog(1)).toBe(true)
    expect(blog(12)).toBe(true)
    expect(blog(13)).toBe(false)
    expect(blog(0)).toBe(false)

    const heroPage = (over: Record<string, unknown>) =>
      BLOCK_BY_TYPE["hero.page"].schema.safeParse({
        image: { mediaId: MEDIA },
        crumb: "About",
        title: "About us",
        description: "Who we are",
        ...over,
      }).success
    expect(heroPage({})).toBe(true)
    expect(heroPage({ image: null })).toBe(true)
    expect(heroPage({ title: "" })).toBe(false)
  })

  it("shared-only blocks take only useShared: true", () => {
    for (const type of [
      "whyChooseUs",
      "clients",
      "team",
      "testimonials",
      "howItWorks",
      "quoteForm",
      "map",
    ] as const) {
      const schema = BLOCK_BY_TYPE[type].schema
      expect(schema.safeParse({ useShared: true }).success).toBe(true)
      expect(schema.safeParse({ useShared: false }).success).toBe(false)
    }
  })

  it("contact: useShared plus an optional title override", () => {
    const schema = BLOCK_BY_TYPE.contact.schema
    expect(schema.safeParse({ useShared: true, title: null }).success).toBe(
      true
    )
    expect(
      schema.safeParse({ useShared: true, title: "Reach us" }).success
    ).toBe(true)
    expect(schema.safeParse({ useShared: true, title: "" }).success).toBe(false)
    expect(schema.safeParse({ useShared: true }).success).toBe(false)
  })

  describe("services layouts", () => {
    const intro = {
      imageA: { mediaId: MEDIA },
      imageAAlt: "a",
      imageB: { mediaId: MEDIA },
      imageBAlt: "b",
      eyebrow: "Services",
      title: "What we do",
      description: "Intro",
      items: [{ title: "Office", description: "Cleaning" }],
      itemIcon: { mediaId: MEDIA },
      moreText: "More",
      cta: link,
    }
    const grid = {
      eyebrow: "Services",
      title: "All",
      intro: "Intro",
      priceBadge: "From",
      learnMoreAria: "About {title}",
      learnMore: "Learn more",
      quoteCta: link,
      helpCard: {
        icon: { mediaId: MEDIA },
        title: "Help",
        body: "Body",
        cta: link,
        callLabel: "Call",
      },
    }
    const schema = BLOCK_BY_TYPE.services.schema

    it("accepts the chosen layout's group", () => {
      expect(
        schema.safeParse({ layout: "intro", intro, grid: null }).success
      ).toBe(true)
      expect(
        schema.safeParse({ layout: "grid", intro: null, grid }).success
      ).toBe(true)
      expect(schema.safeParse({ layout: "grid", intro, grid }).success).toBe(
        true
      )
    })

    it("refuses a chosen layout with a null group, on that group", () => {
      const block = (layout: "intro" | "grid", data: object) => ({
        id: "services-1",
        type: "services",
        anchor: "services",
        hidden: false,
        data: { layout, ...data },
      })
      const gridNull = validateDocument({
        blocks: [block("grid", { intro, grid: null })],
      })
      expect(gridNull.ok).toBe(false)
      if (!gridNull.ok)
        expect(Object.keys(gridNull.fieldErrors)).toEqual([
          "blocks.0.data.grid",
        ])
      const introNull = validateDocument({
        blocks: [block("intro", { intro: null, grid })],
      })
      expect(introNull.ok).toBe(false)
      if (!introNull.ok)
        expect(Object.keys(introNull.fieldErrors)).toEqual([
          "blocks.0.data.intro",
        ])
    })

    it("refuses an unknown layout", () => {
      expect(schema.safeParse({ layout: "x", intro: null, grid }).success).toBe(
        false
      )
    })
  })

  describe("richtext", () => {
    const rich = (content: unknown[]) =>
      BLOCK_BY_TYPE.richtext.schema.safeParse({
        doc: { type: "doc", content },
      })

    it("caps nodes and characters", () => {
      expect(RICH_TEXT_MAX_NODES).toBe(200)
      expect(RICH_TEXT_MAX_CHARS).toBe(50_000)
      expect(rich(Array(200).fill(para("Hi"))).success).toBe(true)
      expect(rich(Array(201).fill(para("Hi"))).success).toBe(false)
      expect(rich([para("x".repeat(20_000))]).success).toBe(true)
      expect(rich([para("x".repeat(50_001))]).success).toBe(false)
    })

    it("refuses unsafe links", () => {
      const linked = (href: string) =>
        rich([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Click",
                marks: [{ type: "link", attrs: { href } }],
              },
            ],
          },
        ]).success
      expect(linked("/contact")).toBe(true)
      expect(linked("javascript:alert(1)")).toBe(false)
      expect(linked("//evil.example")).toBe(false)
    })

    it("keeps the lead and checklist variants and renders them as the legal body does", () => {
      const doc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { variant: "lead" },
            content: para("Opening").content,
          },
          {
            type: "bulletList",
            attrs: { variant: "checklist" },
            content: [{ type: "listItem", content: [para("Ticked")] }],
          },
        ],
      }
      const parsed = BLOCK_BY_TYPE.richtext.schema.parse({ doc })
      expect(parsed.doc).toEqual(doc)
      // The block and the legal pages both render through ArticleBlocks.
      const html = renderToStaticMarkup(
        ArticleBlocks({ doc: parsed.doc as never, checkIcon: "/check.svg" })
      )
      const legal = renderToStaticMarkup(
        ArticleBlocks({ doc: doc as never, checkIcon: "/check.svg" })
      )
      expect(html).toBe(legal)
      expect(html).toContain("text-xl")
      expect(html).toContain("/check.svg")
    })
  })

  it("strips unknown keys at block level", () => {
    const parsed = BlockInstance.parse({
      id: "block-1",
      type: "team",
      anchor: "team",
      hidden: false,
      html: "<script>",
      data: { useShared: true, extra: "x" },
    })
    expect(parsed).not.toHaveProperty("html")
    expect(parsed.data).toEqual({ useShared: true })
  })

  it("BlockInstance discriminates on type", () => {
    const base = { id: "block-1", anchor: "map", hidden: false }
    expect(
      BlockInstance.safeParse({
        ...base,
        type: "map",
        data: { useShared: true },
      }).success
    ).toBe(true)
    expect(
      BlockInstance.safeParse({ ...base, type: "nope", data: {} }).success
    ).toBe(false)
  })
})
