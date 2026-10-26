import { type Browser, expect, type Page, test } from "@playwright/test"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, readFixtures } from "./fixtures"

// R8-4: every page carries the business JSON-LD, built from the seeded
// settings; articles add Article + BreadcrumbList, services BreadcrumbList.

const ARTICLE = "/blog/5-signs-your-office-needs-a-professional-clean"

async function nodes(page: import("@playwright/test").Page, path: string) {
  const response = await page.goto(path, { waitUntil: "load" })
  expect(response?.status()).toBe(200)
  const texts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()
  // A block is one node or an array of nodes (both are valid JSON-LD).
  return texts.flatMap(
    (t) => [JSON.parse(t)].flat() as Record<string, unknown>[]
  )
}

test.describe("JSON-LD", () => {
  for (const [path, extra] of [
    ["/", []],
    ["/services/medical-cleaning", ["BreadcrumbList"]],
    [ARTICLE, ["Article", "BreadcrumbList"]],
  ] as const) {
    test(`${path} parses and matches the seeded settings`, async ({ page }) => {
      const found = await nodes(page, path)
      const types = found.map((n) => n["@type"])
      expect(types).toEqual(expect.arrayContaining(["LocalBusiness", ...extra]))
      const business = found.find((n) => n["@type"] === "LocalBusiness")!
      expect(business.legalName).toBe("Cleaning Partners Ltd.")
      expect(business.telephone).toBe("057 8697670")
      expect(business.email).toBe("info@cleaningpartners.ie")
      expect(JSON.stringify(found)).not.toMatch(/security/i)
    })
  }
})

// R8-5: generated share cards are 1200x630 PNGs for published records only.
test.describe("OG cards", () => {
  for (const path of [
    "/og/page/home",
    "/og/service/medical-cleaning",
    `/og/article/${ARTICLE.slice("/blog/".length)}`,
  ]) {
    test(`${path} is a 1200x630 PNG`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      expect(response.headers()["content-type"]).toBe("image/png")
      const png = await response.body()
      expect(png.subarray(1, 4).toString()).toBe("PNG")
      // IHDR: width and height are big-endian u32 at bytes 16 and 20.
      expect(png.readUInt32BE(16)).toBe(1200)
      expect(png.readUInt32BE(20)).toBe(630)
    })
  }

  for (const path of [
    "/og/service/no-such-service",
    "/og/page/nope",
    "/og/article/Bad_Slug",
    "/og/builder/00000000-0000-4000-8000-000000000000",
  ])
    test(`${path} is 404`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(404)
    })
})

// Task 8 (R8-9): cut-over is safe. Renaming a published service and deleting
// a published article leave the old URLs redirecting, with the hit counted.
// Throwaway records are cloned from the seed through the admin API (as the
// editor); afterAll removes them and the redirects they left (as the owner).
test.describe("moved and deleted pages redirect", () => {
  const SERVICE_A = "e2e-move-from"
  const SERVICE_B = "e2e-move-to"
  const ARTICLE_SLUG = "e2e-delete-me"
  const headers = { origin: BASE_URL }
  const made: { service?: string; article?: string } = {}

  async function signIn(browser: Browser, who: { email: string }, tag: string) {
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": clientIpFor(tag) },
    })
    const page = await context.newPage()
    await page.goto("/admin/sign-in")
    await page.getByLabel("Email").fill(who.email)
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"))
    return { context, page }
  }

  const api = async <T>(page: Page, path: string) =>
    (await (await page.request.get(`/api/v1/admin${path}`)).json()) as T

  /** The first redirect response, not followed. */
  const hop = async (page: Page, path: string) => {
    const res = await page.request.get(path, { maxRedirects: 0 })
    return { status: res.status(), location: res.headers()["location"] ?? "" }
  }

  test("rename a service, delete an article: old URLs redirect and count hits", async ({
    browser,
  }) => {
    const { editor, owner } = readFixtures()
    const ed = await signIn(browser, editor, "seo cutover editor")
    const own = await signIn(browser, owner, "seo cutover owner")
    try {
      const page = ed.page

      // A published service, cloned from the seed, then renamed.
      const seeded = await api<{ items: { id: string; slug: string }[] }>(
        page,
        "/services?pageSize=50"
      )
      const source = await api<{ draft: unknown }>(
        page,
        `/services/${seeded.items[0].id}`
      )
      const createdService = await page.request.post("/api/v1/admin/services", {
        headers,
        data: { slug: SERVICE_A, draft: source.draft },
      })
      expect(createdService.status()).toBe(201)
      const service = (await createdService.json()) as {
        id: string
        version: number
      }
      made.service = service.id
      const publishedService = await page.request.post(
        `/api/v1/admin/services/${service.id}/publish`,
        { headers, data: { version: service.version } }
      )
      expect(publishedService.status()).toBe(200)
      const live = (await publishedService.json()) as { version: number }
      expect((await hop(page, `/services/${SERVICE_A}`)).status).toBe(200)

      const renamed = await page.request.patch(
        `/api/v1/admin/services/${service.id}/slug`,
        { headers, data: { slug: SERVICE_B, version: live.version } }
      )
      expect(renamed.status()).toBe(200)
      const moved = await hop(page, `/services/${SERVICE_A}`)
      expect([301, 308]).toContain(moved.status)
      expect(new URL(moved.location, BASE_URL).pathname).toBe(
        `/services/${SERVICE_B}`
      )
      expect((await hop(page, `/services/${SERVICE_B}`)).status).toBe(200)

      // The hit is written after the response.
      await expect
        .poll(async () => {
          const list = await api<{
            items: { fromPath: string; hits: number }[]
          }>(own.page, `/redirects?q=${SERVICE_A}`)
          return list.items.find((r) => r.fromPath === `/services/${SERVICE_A}`)
            ?.hits
        })
        .toBeGreaterThanOrEqual(1)

      // A published article, cloned from the seed, then deleted.
      const articles = await api<{ items: { id: string }[] }>(
        page,
        "/articles?pageSize=50"
      )
      const model = await api<{ draft: object; category: { id: string } }>(
        page,
        `/articles/${articles.items[0].id}`
      )
      const createdArticle = await page.request.post("/api/v1/admin/articles", {
        headers,
        data: {
          slug: ARTICLE_SLUG,
          categoryId: model.category.id,
          draft: model.draft,
        },
      })
      expect(createdArticle.status()).toBe(201)
      const article = (await createdArticle.json()) as {
        id: string
        version: number
      }
      made.article = article.id
      const publishedArticle = await page.request.post(
        `/api/v1/admin/articles/${article.id}/publish`,
        { headers, data: { version: article.version } }
      )
      expect(publishedArticle.status()).toBe(200)
      const liveArticle = (await publishedArticle.json()) as { version: number }
      expect((await hop(page, `/blog/${ARTICLE_SLUG}`)).status).toBe(200)

      const removed = await page.request.delete(
        `/api/v1/admin/articles/${article.id}?version=${liveArticle.version}`,
        { headers }
      )
      expect(removed.status()).toBe(200)
      made.article = undefined
      const gone = await hop(page, `/blog/${ARTICLE_SLUG}`)
      expect([301, 308]).toContain(gone.status)
      expect(new URL(gone.location, BASE_URL).pathname).toBe("/blog")
    } finally {
      await ed.context.close()
      await own.context.close()
    }
  })

  test.afterAll(async ({ browser }) => {
    const { editor, owner } = readFixtures()
    const ed = await signIn(browser, editor, "seo cutover restore editor")
    const own = await signIn(browser, owner, "seo cutover restore owner")
    try {
      if (made.article) {
        const a = await api<{ version: number }>(
          ed.page,
          `/articles/${made.article}`
        )
        await ed.page.request.delete(
          `/api/v1/admin/articles/${made.article}?version=${a.version}`,
          { headers }
        )
      }
      const services = await api<{
        items: { id: string; slug: string; version: number }[]
      }>(ed.page, "/services?pageSize=100")
      for (const s of services.items.filter((s) =>
        [SERVICE_A, SERVICE_B].includes(s.slug)
      ))
        await ed.page.request.delete(
          `/api/v1/admin/services/${s.id}?version=${s.version}`,
          { headers }
        )
      const left = await api<{ items: { id: string }[] }>(
        own.page,
        "/redirects?q=e2e-&pageSize=100"
      )
      for (const r of left.items)
        await own.page.request.delete(`/api/v1/admin/redirects/${r.id}`, {
          headers,
        })
    } finally {
      await ed.context.close()
      await own.context.close()
    }
  })
})

// R8-10, R8-11: sitemap and robots list absolute CP URLs.
test.describe("sitemap and robots", () => {
  test("/sitemap.xml lists the 19 public URLs on the site origin", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml")
    expect(response.status()).toBe(200)
    const xml = await response.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(19)
    for (const loc of locs) expect(loc).toMatch(/^https?:\/\/[^/]+\//)
    const origin = new URL(locs[0]).origin
    expect(locs).toContain(`${origin}/`)
    expect(locs).toContain(`${origin}/services/medical-cleaning`)
    expect(locs).toContain(
      `${origin}/blog/5-signs-your-office-needs-a-professional-clean`
    )
    expect(locs.some((loc) => loc.includes("?"))).toBe(false)
    expect(xml).not.toMatch(/security/i)
  })

  test("/robots.txt disallows /admin and /api and names the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt")
    expect(response.status()).toBe(200)
    const text = await response.text()
    expect(text).toMatch(/Disallow: \/admin/)
    expect(text).toMatch(/Disallow: \/api/)
    expect(text).toMatch(/Sitemap: https?:\/\/[^/\s]+\/sitemap\.xml/)
  })
})
