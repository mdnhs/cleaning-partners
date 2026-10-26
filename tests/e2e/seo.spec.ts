import { expect, test } from "@playwright/test"

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
