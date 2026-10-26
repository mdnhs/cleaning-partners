import { type Browser, expect, type Page, test } from "@playwright/test"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, readFixtures } from "./fixtures"

// R10-7: /p/<slug> serves published builder pages, answers unknown and
// draft-only ones with the real 404, previews drafts and has a share card.

const headers = { origin: BASE_URL }
const LIVE = "e2e-builder-live"
const DRAFT_ONLY = "e2e-builder-draft"
const GONE = "e2e-builder-gone"

const richtext = (
  id: string,
  anchor: string,
  text: string,
  hidden = false
) => ({
  id,
  type: "richtext",
  anchor,
  hidden,
  data: {
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  },
})
const BLOCKS = [
  {
    id: "hero-1",
    type: "hero.page",
    anchor: "hero",
    hidden: false,
    data: {
      image: null,
      crumb: "Offer",
      title: "E2E builder offer",
      description: "An offer built with blocks.",
    },
  },
  richtext("text-1", "first", "First block copy"),
  richtext("text-2", "hidden", "Hidden block copy", true),
  richtext("text-3", "second", "Second block copy"),
]

type Dto = { id: string; version: number }

test.describe("builder pages on the public site", () => {
  const made: string[] = []

  async function signIn(browser: Browser, tag: string) {
    const { editor } = readFixtures()
    const context = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": clientIpFor(tag) },
    })
    const page = await context.newPage()
    await page.goto("/admin/sign-in")
    await page.getByLabel("Email").fill(editor.email)
    await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"))
    return { context, page }
  }

  async function create(page: Page, slug: string, publish: boolean) {
    const res = await page.request.post("/api/v1/admin/builder-pages", {
      headers,
      data: { slug, title: "E2E builder offer" },
    })
    expect(res.status()).toBe(201)
    let dto = (await res.json()) as Dto
    made.push(dto.id)
    const saved = await page.request.put(
      `/api/v1/admin/builder-pages/${dto.id}/draft`,
      { headers, data: { draft: { blocks: BLOCKS }, version: dto.version } }
    )
    expect(saved.status()).toBe(200)
    dto = (await saved.json()) as Dto
    if (publish) {
      const pub = await page.request.post(
        `/api/v1/admin/builder-pages/${dto.id}/publish`,
        { headers, data: { version: dto.version } }
      )
      expect(pub.status()).toBe(200)
      dto = (await pub.json()) as Dto
    }
    return dto
  }

  test.afterAll(async ({ browser }) => {
    const { context, page } = await signIn(browser, "builder cleanup")
    try {
      for (const id of made) {
        const res = await page.request.get(`/api/v1/admin/builder-pages/${id}`)
        if (res.status() !== 200) continue
        const dto = (await res.json()) as Dto
        await page.request.delete(
          `/api/v1/admin/builder-pages/${id}?version=${dto.version}`,
          { headers }
        )
      }
    } finally {
      await context.close()
    }
  })

  test("missing and draft-only pages are the real 404", async ({
    browser,
    page,
  }) => {
    const ed = await signIn(browser, "builder 404")
    try {
      await create(ed.page, DRAFT_ONLY, false)
      for (const path of ["/p/e2e-no-such-page", `/p/${DRAFT_ONLY}`]) {
        const response = await page.goto(path, { waitUntil: "load" })
        expect(response?.status(), path).toBe(404)
        await expect(
          page.getByText("This page could not be found.")
        ).toBeVisible()
        await expect(page.locator("[data-header]")).toHaveCount(0)
      }
    } finally {
      await ed.context.close()
    }
  })

  test("a deleted page without redirectHome is a 404", async ({
    browser,
    page,
  }) => {
    const ed = await signIn(browser, "builder deleted")
    try {
      const dto = await create(ed.page, GONE, true)
      expect((await page.goto(`/p/${GONE}`))?.status()).toBe(200)
      const res = await ed.page.request.delete(
        `/api/v1/admin/builder-pages/${dto.id}?version=${dto.version}`,
        { headers }
      )
      expect(res.status()).toBe(200)
      const gone = await page.goto(`/p/${GONE}`, { waitUntil: "load" })
      expect(gone?.status()).toBe(404)
      await expect(
        page.getByText("This page could not be found.")
      ).toBeVisible()
    } finally {
      await ed.context.close()
    }
  })

  test("a published page renders its visible blocks in order, with SEO, a card and a preview", async ({
    browser,
    page,
    request,
  }) => {
    const ed = await signIn(browser, "builder live")
    try {
      const dto = await create(ed.page, LIVE, true)

      const seo = await ed.page.request.put(
        `/api/v1/admin/seo/entries/builder/${dto.id}`,
        { headers, data: { seo: { title: "E2E SEO title" } } }
      )
      expect(seo.status()).toBe(200)

      const response = await page.goto(`/p/${LIVE}`, { waitUntil: "load" })
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle("E2E SEO title")
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "E2E builder offer"
      )
      const main = page.locator("main")
      await expect(main.getByText("First block copy")).toBeVisible()
      await expect(main.getByText("Second block copy")).toBeVisible()
      await expect(page.getByText("Hidden block copy")).toHaveCount(0)
      const text = (await main.innerText()).replace(/\s+/g, " ")
      expect(text.indexOf("First block copy")).toBeLessThan(
        text.indexOf("Second block copy")
      )
      // The seeded theme paints no override style.
      await expect(page.locator("style#site-theme")).toHaveCount(0)

      const card = await request.get(`/og/builder/${dto.id}`)
      expect(card.status()).toBe(200)
      expect(card.headers()["content-type"]).toBe("image/png")
      const png = await card.body()
      expect(png.readUInt32BE(16)).toBe(1200)
      expect(png.readUInt32BE(20)).toBe(630)

      const sitemap = await (await request.get("/sitemap.xml")).text()
      expect(sitemap).toContain(`/p/${LIVE}</loc>`)
    } finally {
      await ed.context.close()
    }
  })

  test("a preview of an unpublished page shows the draft with the preview bar", async ({
    browser,
  }) => {
    const ed = await signIn(browser, "builder preview")
    try {
      const dto = await create(ed.page, `${DRAFT_ONLY}-2`, false)
      await ed.page.goto(
        `/api/v1/admin/preview?entity=builder-page&id=${dto.id}`
      )
      await expect(ed.page).toHaveURL(new RegExp(`/p/${DRAFT_ONLY}-2$`))
      await expect(
        ed.page.getByRole("region", { name: "Preview" })
      ).toBeVisible()
      await expect(ed.page.getByText("First block copy")).toBeVisible()
    } finally {
      await ed.context.close()
    }
  })
})
