import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Outside Next there is no cache scope or request: record the tags 'use
// cache' functions declare and the tags that get expired.
const { cacheTag, revalidateTag } = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag, revalidateTag }))
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: false }),
}))

import { getDb } from "@/server/db/client"
import { pages, settings } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { invalidate, tag } from "@/server/lib/cache-tags"
import { findPageByKey, updatePageIfVersion } from "@/server/modules/pages/repo"
import { loadSiteSources } from "@/server/modules/pages/sources"

import { resetDb } from "../db"

/** Ids differ between DB and fixtures; media compare by URL. */
function comparable(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, v) => {
      if (key === "id") return undefined
      if (v && typeof v === "object" && "url" in v && "blurDataUrl" in v)
        return v.url
      return v
    })
  )
}

beforeEach(async () => {
  cacheTag.mockClear()
  revalidateTag.mockClear()
  await resetDb()
  await seedContent(getDb())
})

describe("loadSiteSources (DB)", () => {
  it("returns exactly what the seed fixtures describe", async () => {
    expect(comparable(await loadSiteSources())).toEqual(
      comparable(fixtureSiteSources())
    )
  })

  it("resolves seeded images to their public/ paths, with real dimensions", async () => {
    const sources = await loadSiteSources()
    const logo = sources.settings.site.logo
    expect(logo.url).toMatch(/^\/images\//)
    expect(logo.width).toEqual(expect.any(Number))
    expect(logo.height).toEqual(expect.any(Number))
  })

  it("shows a published edit to pages.home.hero after invalidate(tag.page)", async () => {
    const before = await loadSiteSources()
    const row = (await findPageByKey(getDb(), "home"))!
    const published = row.published as { hero: Record<string, unknown> }
    const heroTitle = "Edited through the repo"
    const edited = await updatePageIfVersion(getDb(), "home", row.version, {
      draft: row.draft,
      published: {
        ...published,
        hero: { ...published.hero, title: heroTitle },
      },
    } as never)
    expect(edited).not.toBeNull()

    invalidate(tag.page("home"))
    expect(revalidateTag.mock.calls).toEqual([
      [tag.page("home"), { expire: 0 }],
    ])
    // The page query declares exactly the tag the publish expires.
    expect(cacheTag).toHaveBeenCalledWith(tag.page("home"))

    const after = await loadSiteSources()
    expect(
      (after.pages.home.data as { hero: { title: unknown } }).hero.title
    ).toBe(heroTitle)
    expect(
      (before.pages.home.data as { hero: { title: unknown } }).hero.title
    ).not.toBe(heroTitle)
  })

  it("fails loudly (error page) when content is not seeded", async () => {
    await getDb().delete(settings).where(eq(settings.key, "footer"))
    await expect(loadSiteSources()).rejects.toThrow(
      "Missing published content: settings.footer. Run pnpm db:seed."
    )
  })

  it("fails loudly when a page was never published", async () => {
    await getDb()
      .update(pages)
      .set({ published: null })
      .where(eq(pages.key, "about"))
    await expect(loadSiteSources()).rejects.toThrow(
      "Missing published content: page about. Run pnpm db:seed."
    )
  })
})
