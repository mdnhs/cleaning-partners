import { beforeAll, describe, expect, it } from "vitest"

import type { OptionItem, SearchResult } from "@/lib/schemas/api/search"
import { getDb } from "@/server/db/client"
import { seedContent } from "@/server/db/seed"

import { resetDb } from "../db"
import { adminRequest, signedInUser } from "../helpers/auth"

let editor: string
let intake: string
let marketer: string
let viewer: string

beforeAll(async () => {
  await resetDb()
  await seedContent(getDb())
  editor = (await signedInUser(["editor"])).cookie
  intake = (await signedInUser(["intake"])).cookie
  marketer = (await signedInUser(["marketer"])).cookie
  viewer = (await signedInUser(["viewer"])).cookie
})

async function search(cookie: string, q: string) {
  const res = await adminRequest(`/search?q=${encodeURIComponent(q)}`, {
    cookie,
  })
  expect(res.status).toBe(200)
  return ((await res.json()) as { items: SearchResult[] }).items
}

describe("GET /api/v1/admin/search (⌘K, master 4.1)", () => {
  it("finds pages, services and collection records an editor can read", async () => {
    const retail = await search(editor, "retail")
    expect(retail.map((r) => [r.type, r.title])).toEqual([
      ["service", "Retail Cleaning"],
      ["article", "Retail Cleaning: Why First Impressions Count"],
      ["category", "Retail"],
    ])
    expect(retail[0].href).toMatch(/^\/admin\/services\/[0-9a-f-]{36}$/)
    expect(retail[0].subtitle).toBe("/services/retail-cleaning")
    expect(retail[1].href).toMatch(/^\/admin\/blog\/[0-9a-f-]{36}$/)
    expect(retail[2].href).toMatch(/^\/admin\/blog\/categories\?edit=/)

    const home = await search(editor, "home")
    expect(home[0]).toEqual({
      type: "page",
      id: "home",
      title: "Home",
      subtitle: "/",
      href: "/admin/pages/home",
    })

    const team = await search(editor, "moran")
    expect(team).toEqual([
      expect.objectContaining({ type: "team", title: "Sarah Moran" }),
    ])

    const review = await search(editor, "murray")
    expect(review).toEqual([
      expect.objectContaining({
        type: "testimonial",
        title: "Thomas Murray",
        href: expect.stringMatching(
          /^\/admin\/collections\/testimonials\?edit=[0-9a-f-]{36}$/
        ),
      }),
    ])
  })

  it("filters result types by read permission", async () => {
    expect(await search(intake, "retail")).toEqual([])
    // marketer reads pages, services and articles but not collections
    expect((await search(marketer, "retail")).map((r) => r.type)).toEqual([
      "service",
      "article",
    ])
    // viewer reads pages, services, articles and collections (read-only role)
    expect((await search(viewer, "retail")).map((r) => r.type)).toEqual([
      "service",
      "article",
      "category",
    ])
    expect((await search(viewer, "moran")).map((r) => r.type)).toEqual(["team"])
  })

  it("treats LIKE wildcards and the escape character literally", async () => {
    expect(await search(editor, "%")).toEqual([])
    // Unescaped, "_" would match the "-" in the slug "retail-cleaning".
    expect(await search(editor, "retail_cleaning")).toEqual([])
    expect(await search(editor, "_")).toEqual([])
    // A lone backslash is a literal character, not a broken escape.
    expect(await search(editor, "\\")).toEqual([])
    expect(await search(editor, "retail\\")).toEqual([])
  })

  it("caps each type at five results", async () => {
    // All seven seeded articles contain an "a".
    const articles = (await search(editor, "a")).filter(
      (r) => r.type === "article"
    )
    expect(articles).toHaveLength(5)
  })

  it("finds articles for every article reader; others' articles open read-only (Phase 5)", async () => {
    const author = await signedInUser(["author"])
    const results = (await search(author.cookie, "stubborn")).filter(
      (r) => r.type === "article"
    )
    expect(results).toEqual([
      expect.objectContaining({
        title: "How to Get Stubborn Stains Out of Curtains",
        subtitle: "/blog/how-to-get-stubborn-stains-out-of-curtains",
      }),
    ])
    expect(results[0].href).toMatch(/^\/admin\/blog\/[0-9a-f-]{36}$/)
    expect(
      (await search(intake, "stubborn")).filter((r) => r.type === "article")
    ).toEqual([])
  })

  it("rejects an empty query and anonymous requests", async () => {
    expect((await adminRequest("/search?q=", { cookie: editor })).status).toBe(
      422
    )
    expect((await adminRequest("/search?q=x")).status).toBe(401)
  })
})

describe("GET /api/v1/admin/search/options/:collection (SchemaForm pickers)", () => {
  async function options(cookie: string, collection: string) {
    const res = await adminRequest(`/search/options/${collection}`, { cookie })
    return {
      status: res.status,
      items: res.ok
        ? ((await res.json()) as { items: OptionItem[] }).items
        : [],
    }
  }

  it("lists articles by slug and links by URL path", async () => {
    const articles = await options(editor, "articles")
    expect(articles.status).toBe(200)
    expect(articles.items).toContainEqual({
      value: "5-signs-your-office-needs-a-professional-clean",
      label: "5 Signs Your Office Needs a Professional Clean",
      group: "Articles",
    })
    const links = await options(editor, "links")
    expect(links.items.map((i) => i.value)).toEqual(
      expect.arrayContaining([
        "/",
        "/contact",
        "/services/retail-cleaning",
        "/blog/5-signs-your-office-needs-a-professional-clean",
      ])
    )
  })

  it("lists pages and links by URL path, services by slug, categories by id", async () => {
    const pages = await options(editor, "pages")
    expect(pages.status).toBe(200)
    expect(pages.items).toHaveLength(7)
    expect(pages.items[0]).toEqual({
      value: "/",
      label: "Home",
      group: "Pages",
    })
    expect(pages.items).toContainEqual({
      value: "/privacy",
      label: "Privacy policy",
      group: "Pages",
    })

    const services = await options(editor, "services")
    expect(services.status).toBe(200)
    expect(services.items).toHaveLength(5)
    expect(services.items).toContainEqual({
      value: "retail-cleaning",
      label: "Retail Cleaning",
      group: "Services",
    })

    const categories = await options(editor, "categories")
    expect(categories.status).toBe(200)
    expect(categories.items).toContainEqual({
      value: expect.stringMatching(/^[0-9a-f-]{36}$/),
      label: "Retail",
      group: "Categories",
    })
  })

  it("enforces read permission per collection", async () => {
    expect((await options(intake, "articles")).status).toBe(403)
    expect((await options(intake, "links")).items).toEqual([])
    expect((await options(editor, "nope")).status).toBe(422)
  })
})
