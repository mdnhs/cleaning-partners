import { eq } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Outside Next there is no cache scope or request: record tags, toggle draft mode.
const { cacheTag, draft } = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  draft: { isEnabled: false },
}))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag }))
vi.mock("next/headers", () => ({ draftMode: async () => draft }))

import { getDb } from "@/server/db/client"
import { articles, media, pages, services } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { contentFixtures } from "@/server/db/seed/fixtures"
import type { MediaLookup } from "@/server/db/seed/fixtures/media"
import { getArticle, listArticles } from "@/server/modules/articles/queries"
import {
  listCategories,
  listClients,
  listGroupCompanies,
  listTeam,
  listTestimonials,
} from "@/server/modules/collections/queries"
import { getMedia, resolveMedia } from "@/server/modules/media/queries"
import { getPage } from "@/server/modules/pages/queries"
import { getService, listServices } from "@/server/modules/services/queries"
import {
  getPublishedSettings,
  getSettings,
} from "@/server/modules/settings/queries"

import { resetDb } from "../db"

let fx: ReturnType<typeof contentFixtures>

async function loadFixtures() {
  const rows = await getDb()
    .select({ id: media.id, key: media.key })
    .from(media)
  const byKey = new Map(rows.map((r) => [r.key, r.id]))
  const lookup: MediaLookup = (key) => ({ mediaId: byKey.get(key)! })
  fx = contentFixtures(lookup)
}

beforeAll(async () => {
  await resetDb()
  await seedContent(getDb())
  await loadFixtures()
})

beforeEach(() => {
  cacheTag.mockClear()
  draft.isEnabled = false
})

describe("public queries (master Task 3.4)", () => {
  it("getPage returns the published data and seo, tagged page:<key>", async () => {
    const home = await getPage("home")
    expect(home).toEqual({ key: "home", data: fx.pages.home.data, seo: {} })
    expect(cacheTag).toHaveBeenCalledWith("page:home")
    expect((await getPage("about"))?.seo).toEqual(fx.pages.about.seo)
  })

  it("getSettings returns the published value, tagged settings:<key>", async () => {
    expect(await getSettings("contact")).toEqual(fx.settings.contact)
    expect(cacheTag).toHaveBeenCalledWith("settings:contact")
    expect(await getPublishedSettings("site")).toEqual(fx.settings.site)
    expect(cacheTag).toHaveBeenCalledWith("settings:site")
  })

  it("lists services in display order and finds one by slug", async () => {
    const list = await listServices()
    expect(list.map((s) => s.slug)).toEqual(fx.services.map((s) => s.slug))
    expect(list[0].content).toEqual(fx.services[0].content)
    const one = await getService("medical-cleaning")
    expect(one?.content.title).toBe("Medical Cleaning")
    expect(cacheTag).toHaveBeenCalledWith(
      "services",
      "service:medical-cleaning"
    )
  })

  it("returns null for unknown slugs", async () => {
    expect(await getService("no-such-service")).toBeNull()
    expect(await getArticle("no-such-article")).toBeNull()
  })

  it("lists articles newest first with category", async () => {
    const list = await listArticles()
    expect(list.map((a) => a.slug)).toEqual(fx.articles.map((a) => a.slug))
    expect(list[1]).toMatchObject({
      slug: "5-signs-your-office-needs-a-professional-clean",
      readTimeMinutes: 5,
      category: { slug: "commercial", name: "Commercial" },
      author: null,
    })
    expect(list[0].publishedAt).toEqual(new Date("2026-09-28T09:00:00Z"))
    expect(cacheTag).toHaveBeenCalledWith("articles", "categories")
  })

  it("filters articles by category slug and limits", async () => {
    const commercial = await listArticles({ category: "commercial" })
    expect(commercial.map((a) => a.slug)).toEqual(
      fx.articles
        .filter((a) => a.categorySlug === "commercial")
        .map((a) => a.slug)
    )
    expect(await listArticles({ limit: 2 })).toHaveLength(2)
  })

  it("hides unpublished records, shows drafts in draft mode", async () => {
    const db = getDb()
    const slug = "what-is-ulv-fogging-and-when-do-you-need-it"
    await db
      .update(articles)
      .set({ published: null })
      .where(eq(articles.slug, slug))
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.key, "services"))
    const published = (await getPage("services"))!.data
    const draftData = structuredClone(page.draft) as typeof published
    draftData.hero.title = "Draft title"
    await db
      .update(pages)
      .set({ draft: draftData })
      .where(eq(pages.key, "services"))
    await db
      .update(services)
      .set({ published: null })
      .where(eq(services.slug, "ulv-fogging"))
    try {
      expect(await getArticle(slug)).toBeNull()
      expect((await listArticles()).map((a) => a.slug)).not.toContain(slug)
      expect((await getPage("services"))?.data.hero.title).toBe(
        published.hero.title
      )
      expect(await getService("ulv-fogging")).toBeNull()
      draft.isEnabled = true
      expect((await getPage("services"))?.data.hero.title).toBe("Draft title")
      expect((await getArticle(slug))?.slug).toBe(slug)
      expect((await listServices()).map((s) => s.slug)).toContain("ulv-fogging")
    } finally {
      await resetDb()
      await seedContent(db)
      await loadFixtures()
    }
  })

  it("lists the small collections in display order", async () => {
    expect((await listCategories()).map((c) => c.name)).toEqual(
      fx.categories.map((c) => c.name)
    )
    expect(await listTeam()).toEqual(
      fx.team.map((t) => ({
        id: expect.any(String),
        name: t.name,
        role: t.role,
        bio: t.bio,
        photo: t.photo,
      }))
    )
    expect(await listClients()).toEqual(
      fx.clients.map((c) => ({ ...c, id: expect.any(String) }))
    )
    expect(await listGroupCompanies()).toEqual(
      fx.groupCompanies.map((g) => ({ ...g, id: expect.any(String) }))
    )
  })

  it("lists testimonials by sort order, tagged testimonials", async () => {
    cacheTag.mockClear()
    expect(await listTestimonials()).toEqual(
      fx.testimonials.map((t) => ({ ...t, id: expect.any(String) }))
    )
    expect(cacheTag).toHaveBeenCalledWith("testimonials")
  })

  it("serves static media at its public/ path and resolves references", async () => {
    const page = await getPage("home")
    const resolved = await resolveMedia(page!.data)
    expect(resolved.hero.background.url).toBe("/images/home/hero.png")
    const view = await getMedia(fx.pages.home.data.hero.background.mediaId)
    expect(view?.url).toBe("/images/home/hero.png")
    expect(await getMedia("00000000-0000-7000-8000-000000000999")).toBeNull()
    await expect(
      resolveMedia({
        image: { mediaId: "00000000-0000-7000-8000-000000000999" },
      })
    ).rejects.toThrow("not found")
  })
})
