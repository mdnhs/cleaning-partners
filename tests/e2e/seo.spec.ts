import { expect, test } from "@playwright/test"

// R8-4: every page carries the business JSON-LD, built from the seeded
// settings; articles add Article + BreadcrumbList, services BreadcrumbList.

const ARTICLE = "/blog/5-signs-your-office-needs-a-professional-clean"

async function nodes(page: import("@playwright/test").Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" })
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
      expect(business.legalName).toMatch(/^Cleaning Partners Ltd/)
      expect(business.telephone).toBe("057 8697670")
      expect(business.email).toBe("info@cleaningpartners.ie")
      expect(JSON.stringify(found)).not.toMatch(/security/i)
    })
  }
})
