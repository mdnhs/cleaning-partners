import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))
const { flags } = vi.hoisted(() => ({ flags: { previewer: false } }))
vi.mock("@/server/modules/preview/guard", () => ({
  previewerCan: async () => flags.previewer,
}))

import { getDb } from "@/server/db/client"
import { builderPages, redirects } from "@/server/db/schema"
import { seedContent } from "@/server/db/seed"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import {
  getBuilderPageForRequest,
  isPublishedBuilderSlug,
} from "@/server/modules/builder-pages/queries"
import { resolvePublicPath } from "@/server/modules/redirects/resolve"
import { listSitemapEntries } from "@/server/modules/seo/queries"
import { builderView } from "@/templates/builder/views"

import { resetDb } from "../db"

const live = { draft: false }
const text = (id: string, anchor: string) => ({
  id,
  type: "richtext",
  anchor,
  hidden: false,
  data: {
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
    },
  },
})
const incompleteServices = {
  id: "services-1",
  type: "services",
  anchor: "services",
  hidden: false,
  data: { layout: "grid", intro: null, grid: null },
}

async function insertPage(
  slug: string,
  opts: { published: boolean; blocks?: unknown[] }
) {
  const doc = { blocks: opts.blocks ?? [text("text-1", "intro")] }
  await getDb()
    .insert(builderPages)
    .values({
      slug,
      title: slug,
      draft: doc as never,
      published: opts.published ? (doc as never) : null,
      status: opts.published ? "published" : "draft",
      publishedAt: opts.published ? new Date() : null,
    })
}

beforeEach(async () => {
  flags.previewer = false
  await resetDb()
  await seedContent(getDb())
})

describe("resolvePublicPath for builder pages", () => {
  it("published passes; unknown, draft-only and malformed are missing", async () => {
    await insertPage("spring-offer", { published: true })
    await insertPage("coming-soon", { published: false })
    expect(await resolvePublicPath("/p/spring-offer", live)).toEqual({
      kind: "pass",
    })
    for (const path of ["/p/nope", "/p/coming-soon", "/p/Bad_Slug"])
      expect(await resolvePublicPath(path, live), path).toEqual({
        kind: "missing",
      })
  })

  it("a draft cookie passes an unpublished page", async () => {
    await insertPage("coming-soon", { published: false })
    expect(await resolvePublicPath("/p/coming-soon", { draft: true })).toEqual({
      kind: "pass",
    })
  })

  it("an old address after a rename is a 301 to the new one", async () => {
    await insertPage("new", { published: true })
    await getDb()
      .insert(redirects)
      .values({ fromPath: "/p/old", toPath: "/p/new" })
    expect(await resolvePublicPath("/p/old", live)).toMatchObject({
      kind: "redirect",
      to: "/p/new",
      code: 301,
    })
  })

  it("a deleted page without a redirect is missing", async () => {
    await insertPage("gone", { published: true })
    await getDb().delete(builderPages).where(eq(builderPages.slug, "gone"))
    expect(await resolvePublicPath("/p/gone", live)).toEqual({
      kind: "missing",
    })
  })
})

describe("builder page queries", () => {
  it("isPublishedBuilderSlug: published only, malformed never queried", async () => {
    await insertPage("spring-offer", { published: true })
    await insertPage("coming-soon", { published: false })
    expect(await isPublishedBuilderSlug("spring-offer")).toBe(true)
    expect(await isPublishedBuilderSlug("coming-soon")).toBe(false)
    expect(await isPublishedBuilderSlug("Nope!")).toBe(false)
    expect(await isPublishedBuilderSlug("x".repeat(61))).toBe(false)
  })

  it("visitors get the published copy; an unpublished page is null", async () => {
    await insertPage("spring-offer", { published: true })
    await insertPage("coming-soon", { published: false })
    expect(
      (await getBuilderPageForRequest("spring-offer"))?.blocks
    ).toHaveLength(1)
    expect(await getBuilderPageForRequest("coming-soon")).toBeNull()
    expect(await getBuilderPageForRequest("Bad_Slug")).toBeNull()
  })

  it("a previewer sees the draft, and an incomplete services block is dropped (no throw)", async () => {
    await insertPage("coming-soon", {
      published: false,
      blocks: [text("text-1", "intro"), incompleteServices, { type: "nope" }],
    })
    flags.previewer = true
    const page = await getBuilderPageForRequest("coming-soon")
    expect(page?.blocks.map((b) => b.id)).toEqual(["text-1"])
    expect(() =>
      builderView(fixtureSiteSources(), page!.blocks as never)
    ).not.toThrow()
  })
})

describe("sitemap", () => {
  it("lists published builder pages only", async () => {
    await insertPage("spring-offer", { published: true })
    await insertPage("coming-soon", { published: false })
    const paths = (await listSitemapEntries()).map((e) => e.path)
    expect(paths).toContain("/p/spring-offer")
    expect(paths).not.toContain("/p/coming-soon")
  })
})
