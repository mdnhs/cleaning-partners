import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { getDb } from "@/server/db/client"
import {
  articles,
  builderPages,
  pages,
  revisions,
  services,
  settings,
} from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { buildSitemap } from "@/lib/seo/sitemap"
import { getSiteOrigin, listSitemapEntries } from "@/server/modules/seo/queries"
import { PAGE_PATHS } from "@/templates/registry"

import { resetDb } from "../db"

const fx = fixtureSiteSources()
const PAGES = Object.keys(PAGE_PATHS).length

beforeEach(async () => {
  await resetDb()
  await seedContent(getDb())
})

describe("sitemap entries (published only)", () => {
  it("the seeded site lists 19 URLs: 7 pages, 5 services, 7 articles, with lastmod", async () => {
    const entries = await listSitemapEntries()
    const paths = entries.map((e) => e.path)
    expect(paths.slice(0, PAGES).sort()).toEqual(
      [
        "/",
        "/about",
        "/blog",
        "/contact",
        "/privacy",
        "/services",
        "/terms",
      ].sort()
    )
    expect(paths).toContain("/services/medical-cleaning")
    expect(fx.services).toHaveLength(5)
    expect(fx.articles).toHaveLength(7)
    expect(paths).toHaveLength(19)
    expect(new Set(paths).size).toBe(19)
    for (const entry of entries)
      expect(entry.lastModified, entry.path).toBeInstanceOf(Date)
  })

  it("a draft service is absent; a noindex article is reported", async () => {
    await getDb()
      .update(services)
      .set({ published: null })
      .where(eq(services.slug, "ulv-fogging"))
    const article = fx.articles[0]
    await getDb()
      .update(articles)
      .set({ seo: { noindex: true, canonical: "https://x.ie/a" } })
      .where(eq(articles.slug, article.slug))
    const entries = await listSitemapEntries()
    expect(entries.map((e) => e.path)).not.toContain("/services/ulv-fogging")
    expect(
      entries.find((e) => e.path === `/blog/${article.slug}`)
    ).toMatchObject({
      noindex: true,
      canonical: "https://x.ie/a",
    })
  })

  it("a noindex article is absent from the sitemap that is served", async () => {
    const article = fx.articles[0]
    await getDb()
      .update(articles)
      .set({ seo: { noindex: true } })
      .where(eq(articles.slug, article.slug))
    const origin = await getSiteOrigin()
    const urls = buildSitemap(await listSitemapEntries(), origin).map(
      (e) => e.url
    )
    expect(urls).not.toContain(`${origin}/blog/${article.slug}`)
    expect(urls).toContain(`${origin}/blog/${fx.articles[1].slug}`)
  })

  // 10.3: flips when builder pages ship
  it("a published builder page is not in the sitemap until 10.3", async () => {
    await getDb()
      .insert(builderPages)
      .values({
        slug: "spring-offer",
        title: "Spring offer",
        draft: { blocks: [] },
        published: { blocks: [] },
        status: "published",
        publishedAt: new Date(),
        seo: {},
      })
    const entries = await listSitemapEntries()
    expect(entries.map((e) => e.path)).not.toContain("/p/spring-offer")
    expect(entries).toHaveLength(19)
  })

  it("unpublished pages are left out; a blank canonical counts as none", async () => {
    await getDb()
      .update(pages)
      .set({ published: null, seo: {} })
      .where(eq(pages.key, "terms"))
    await getDb()
      .update(pages)
      .set({ seo: { canonical: "  " } })
      .where(eq(pages.key, "about"))
    const entries = await listSitemapEntries()
    expect(entries.map((e) => e.path)).not.toContain("/terms")
    expect(entries.find((e) => e.path === "/about")?.canonical).toBeNull()
  })

  it("a published page row the registry does not know is left out", async () => {
    await getDb().insert(pages).values({
      key: "legacy-landing",
      template: "legal",
      draft: {},
      published: {},
      status: "published",
      publishedAt: new Date(),
    })
    const entries = await listSitemapEntries()
    expect(entries).toHaveLength(19)
    for (const entry of entries) expect(entry.path, entry.path).toMatch(/^\//)
  })

  it("lastmod is the newest of the publish date and the last revision", async () => {
    const [service] = await getDb()
      .select({ id: services.id, publishedAt: services.publishedAt })
      .from(services)
      .where(eq(services.slug, "medical-cleaning"))
    const later = new Date((service.publishedAt?.getTime() ?? 0) + 86_400_000)
    await getDb().insert(revisions).values({
      entityType: "service",
      entityId: service.id,
      version: 99,
      data: {},
      createdAt: later,
    })
    const entries = await listSitemapEntries()
    expect(
      entries.find((e) => e.path === "/services/medical-cleaning")?.lastModified
    ).toEqual(later)
  })
})

describe("site origin for absolute URLs", () => {
  it("is the published productionUrl's origin, else BETTER_AUTH_URL's", async () => {
    const [row] = await getDb()
      .select({ published: settings.published })
      .from(settings)
      .where(eq(settings.key, "site"))
    await getDb()
      .update(settings)
      .set({ published: { ...(row.published as object), productionUrl: null } })
      .where(eq(settings.key, "site"))
    expect(await getSiteOrigin()).toBe(
      new URL(process.env.BETTER_AUTH_URL ?? "").origin
    )
    await getDb()
      .update(settings)
      .set({
        published: {
          ...(row.published as object),
          productionUrl: "https://www.cleaningpartners.ie/home",
        },
      })
      .where(eq(settings.key, "site"))
    expect(await getSiteOrigin()).toBe("https://www.cleaningpartners.ie")
  })
})
