import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { seo } from "@/lib/schemas/common"
import { articleContent } from "@/lib/schemas/content/article"
import { categorySchema } from "@/lib/schemas/content/category"
import { clientSchema } from "@/lib/schemas/content/client"
import { groupCompanySchema } from "@/lib/schemas/content/group-company"
import { serviceSchema } from "@/lib/schemas/content/service"
import { teamMemberSchema } from "@/lib/schemas/content/team-member"
import { testimonialSchema } from "@/lib/schemas/content/testimonial"
import { contentFixtures } from "@/server/db/seed/fixtures"
import {
  fixtureMediaId,
  fixtureMediaKey,
  fixtureMediaLookup,
  MEDIA,
} from "@/server/db/seed/fixtures/media"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"

import { frozenArray, frozenModule, frozenString } from "../helpers/frozen"

const fx = contentFixtures(fixtureMediaLookup)

type FrozenService = {
  slug: string
  title: string
  icon: string
  cover: string
  summary: string
  tags: string[]
  heroDescription: string
  overviewTitle: string
  overview: string[]
  included: string[]
  places: string[]
}
type FrozenBlock =
  | { type: "lead" | "h2" | "p"; text: string }
  | { type: "quote"; text: string; cite: string }
  | { type: "checklist"; items: string[] }
type FrozenPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  cover: string
  readTime?: string
  tags?: string[]
  body?: FrozenBlock[]
}

const frozenServices = frozenModule<{ services: FrozenService[] }>(
  "lib/services.ts"
).services
const { blogPosts, blogCategories } = frozenModule<{
  blogPosts: FrozenPost[]
  blogCategories: string[]
}>("lib/blog-posts.ts")

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

/** A paragraphs doc as its paragraphs' text. */
const texts = (doc: { content: Node[] }) => doc.content.map(plain)

type Node = {
  type: string
  attrs?: Record<string, unknown>
  content?: Node[]
  text?: string
}
const plain = (node: Node) =>
  (node.content ?? []).map((t) => t.text ?? "").join("")

/** The R3-4 mapping, reversed: TipTap body back to CP's ArticleBlock list. */
function toBlocks(body: { content: Node[] }): FrozenBlock[] {
  return body.content.map((node): FrozenBlock => {
    switch (node.type) {
      case "paragraph":
        return {
          type: node.attrs?.variant === "lead" ? "lead" : "p",
          text: plain(node),
        }
      case "heading":
        expect(node.attrs).toEqual({ level: 2 })
        return { type: "h2", text: plain(node) }
      case "blockquote":
        return {
          type: "quote",
          text: plain(node.content![0]),
          cite: node.attrs!.cite as string,
        }
      case "bulletList":
        expect(node.attrs).toEqual({ variant: "checklist" })
        return {
          type: "checklist",
          items: node.content!.map((item) => plain(item.content![0])),
        }
      default:
        throw new Error(`Unmapped node ${node.type}`)
    }
  })
}

describe("seed fixtures (master Task 3.3)", () => {
  it("parse against the content schemas and round-trip unchanged", () => {
    for (const s of fx.services) {
      const input = { slug: s.slug, ...s.content }
      expect(serviceSchema.parse(input)).toEqual(input)
      expect(seo.parse(s.seo)).toEqual(s.seo)
    }
    for (const a of fx.articles) {
      // Full-tree toEqual also catches a stripped attrs key (e.g. the variants).
      expect(articleContent.parse(a.content)).toEqual(a.content)
      expect(seo.parse(a.seo)).toEqual(a.seo)
    }
    for (const c of fx.categories) expect(categorySchema.parse(c)).toEqual(c)
    for (const t of fx.team) expect(teamMemberSchema.parse(t)).toEqual(t)
    for (const c of fx.clients) expect(clientSchema.parse(c)).toEqual(c)
    for (const g of fx.groupCompanies)
      expect(groupCompanySchema.parse(g)).toEqual(g)
    for (const t of fx.testimonials)
      expect(testimonialSchema.parse(t)).toEqual(t)
  })

  it("has the static site's records in display order, with the counts", () => {
    expect(fx.services.map((s) => s.slug)).toEqual([
      "medical-cleaning",
      "board-of-education",
      "commercial-cleaning",
      "retail-cleaning",
      "ulv-fogging",
    ])
    expect(fx.articles.map((a) => a.slug)).toEqual(blogPosts.map((p) => p.slug))
    expect(fx.articles).toHaveLength(7)
    const dates = fx.articles.map((a) => a.publishedAt.getTime())
    expect([...dates].sort((x, y) => y - x)).toEqual(dates)
    expect(fx.categories.map((c) => c.name)).toEqual([
      "Medical",
      "Commercial",
      "Domestic",
      "Education",
      "Retail",
      "ULV Fogging",
    ])
    expect(fx.categories.every((c) => c.showInFilter)).toBe(true)
    expect(fx.team).toHaveLength(3)
    expect(fx.clients).toHaveLength(7)
    expect(fx.groupCompanies[1].name).toBe("MJS Eco")
    expect(fx.testimonials).toHaveLength(3)
  })

  it("references only known categories and the featured article", () => {
    const categories = new Set(fx.categories.map((c) => c.slug))
    for (const a of fx.articles) expect(categories).toContain(a.categorySlug)
    // null = the newest article is featured (today's blog page).
    const featured = fx.pages.blog.data.featuredArticle
    if (featured !== null)
      expect(fx.articles.map((a) => a.slug)).toContain(featured)
  })

  it("uses every library image and only library images", () => {
    const used = mediaIds(fx)
    expect([...used].map(fixtureMediaKey).sort()).toEqual(
      MEDIA.map((m) => m.key).sort()
    )
  })

  it("library keys are files in public/", () => {
    for (const { key } of MEDIA)
      expect(existsSync(resolve("public", `.${key}`)), key).toBe(true)
    expect(fixtureMediaKey(fixtureMediaId("/images/home/hero.png"))).toBe(
      "/images/home/hero.png"
    )
  })
})

describe("collections are verbatim from the static site at 3689369", () => {
  it("services match lib/services.ts field by field", () => {
    expect(fx.services).toHaveLength(frozenServices.length)
    fx.services.forEach((s, i) => {
      const f = frozenServices[i]
      expect(s.slug).toBe(f.slug)
      expect(s.content).toMatchObject({
        title: f.title,
        summary: f.summary,
        tags: f.tags,
        heroDescription: f.heroDescription,
        overviewTitle: f.overviewTitle,
        included: f.included,
        places: f.places,
      })
      expect(texts(s.content.overview)).toEqual(f.overview)
      expect(fixtureMediaKey(s.content.icon.mediaId)).toBe(f.icon)
      expect(fixtureMediaKey(s.content.cover.mediaId)).toBe(f.cover)
    })
  })

  it("articles match lib/blog-posts.ts field by field", () => {
    fx.articles.forEach((a, i) => {
      const f = blogPosts[i]
      expect(a.content.title).toBe(f.title)
      expect(a.content.excerpt).toBe(f.excerpt)
      expect(a.content.tags).toEqual(f.tags ?? [])
      expect(fixtureMediaKey(a.content.cover.mediaId)).toBe(f.cover)
      expect(fx.categories.find((c) => c.slug === a.categorySlug)?.name).toBe(
        f.category
      )
      expect(a.publishedAt.toISOString().slice(0, 10)).toBe(f.date)
      expect(a.readTimeMinutes).toBe(f.readTime ? parseInt(f.readTime) : null)
      // The six without a body use the nullable rule.
      expect(a.content.lead).toBeNull()
      if (f.body) expect(toBlocks(a.content.body!)).toEqual(f.body)
      else expect(a.content.body).toBeNull()
    })
    expect(fx.categories.map((c) => c.name)).toEqual(blogCategories)
  })

  it("only 5-signs… has a body; it maps to TipTap per R3-4", () => {
    const withBody = fx.articles.filter((a) => a.content.body)
    expect(withBody.map((a) => a.slug)).toEqual([
      "5-signs-your-office-needs-a-professional-clean",
    ])
    const body = withBody[0].content.body!
    expect(body.content.map((n) => n.type)).toEqual([
      "paragraph",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
      "blockquote",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
      "bulletList",
    ])
    expect(body.content[0]).toMatchObject({
      type: "paragraph",
      attrs: { variant: "lead" },
    })
    expect(body.content.at(-1)).toMatchObject({
      type: "bulletList",
      attrs: { variant: "checklist" },
    })
    expect(body.content[7]).toMatchObject({
      type: "blockquote",
      attrs: { cite: "The Clean Team" },
    })
  })

  it("article bodies use only nodes the renderer supports (R3-4)", () => {
    // paragraph (lead), heading 2, blockquote, bulletList (checklist), no marks.
    const SUPPORTED = new Set([
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "listItem",
      "text",
    ])
    const walk = (node: Node) => {
      expect(SUPPORTED, node.type).toContain(node.type)
      if (node.type === "heading") expect(node.attrs).toEqual({ level: 2 })
      expect(node).not.toHaveProperty("marks")
      node.content?.forEach(walk)
    }
    for (const a of fx.articles) a.content.body?.content.forEach(walk)
  })

  it("team matches components/home/team.tsx", () => {
    const frozen = frozenArray<{ name: string; role: string; bio: string }>(
      "components/home/team.tsx",
      "team",
      {
        TEMP_PHOTO: frozenString("components/home/team.tsx", "TEMP_PHOTO"),
      }
    )
    expect(fx.team.map(({ name, role, bio }) => ({ name, role, bio }))).toEqual(
      frozen.map(({ name, role, bio }) => ({ name, role, bio }))
    )
    for (const member of fx.team)
      expect(fixtureMediaKey(member.photo!.mediaId)).toBe(
        "/images/home/team-temp.png"
      )
  })

  it("clients match components/home/clients.tsx", () => {
    const frozen = frozenArray<{ name: string; logo: string }>(
      "components/home/clients.tsx",
      "clients"
    )
    expect(
      fx.clients.map((c) => ({
        name: c.name,
        logo: fixtureMediaKey(c.logo.mediaId),
      }))
    ).toEqual(frozen)
    expect(fx.clients.every((c) => c.url === null)).toBe(true)
  })

  it("group companies match components/home/site-footer.tsx", () => {
    const frozen = frozenArray<{
      name: string
      phone: string
      site: string
      logo: string
    }>("components/home/site-footer.tsx", "groupCompanies")
    expect(
      fx.groupCompanies.map((g) => ({
        ...g,
        logo: fixtureMediaKey(g.logo.mediaId),
      }))
    ).toEqual(frozen)
  })

  it("testimonials match components/home/testimonials.tsx", () => {
    const frozen = frozenArray<{
      name: string
      initials: string
      quote: string
    }>("components/home/testimonials.tsx", "testimonials")
    expect(fx.testimonials).toEqual(frozen.map((t) => ({ ...t, rating: 5 })))
  })
})

describe("fixtureSiteSources", () => {
  const sources = fixtureSiteSources()

  it("resolves every media ref to its static /images/... url", () => {
    expect(JSON.stringify(sources)).not.toContain("mediaId")
    expect(sources.services.map((s) => s.content.icon.url)).toEqual(
      frozenServices.map((s) => s.icon)
    )
    expect(sources.services.map((s) => s.content.cover.url)).toEqual(
      frozenServices.map((s) => s.cover)
    )
    expect(sources.articles.map((a) => a.content.cover.url)).toEqual(
      blogPosts.map((p) => p.cover)
    )
    expect(sources.groupCompanies.map((g) => g.logo.url)).toEqual([
      "/images/home/security-partners.png",
      "/images/home/mjs-eco.png",
    ])
  })

  it("carries every collection and page", () => {
    expect(Object.keys(sources.pages)).toHaveLength(7)
    expect(sources.testimonials).toHaveLength(3)
    expect(sources.categories).toHaveLength(6)
    expect(sources.articles.map((a) => a.category.name)).toEqual(
      blogPosts.map((p) => p.category)
    )
  })
})
