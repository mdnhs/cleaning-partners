import { expect, test } from "@playwright/test"

// R8-9: an unknown service or article slug is a real 404 (status 404: the
// proxy rewrites it to /_cp-missing before anything streams, and
// app/global-not-found.tsx answers). It must render the same branded 404 page
// as an unmatched URL, noindex'ed, pixel-identical (tests/visual:
// /this-page-does-not-exist).
test.describe("unknown slugs render the site's 404 page", () => {
  for (const path of ["/blog/no-such-article", "/services/no-such-service"]) {
    test(`${path} looks like an unmatched URL`, async ({ page }) => {
      await page.goto("/this-page-does-not-exist", { waitUntil: "networkidle" })
      const unmatched = await page.screenshot({
        fullPage: true,
        animations: "disabled",
      })

      const response = await page.goto(path, { waitUntil: "networkidle" })
      expect(response?.status()).toBe(404)
      await expect(
        page.getByText("This page could not be found.")
      ).toBeVisible()
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
      // Nothing of the article or service page around it.
      await expect(page.locator("[data-header]")).toHaveCount(0)
      await expect(page.locator("footer")).toHaveCount(0)
      await expect(
        page.locator('meta[name="robots"][content="noindex"]').first()
      ).toBeAttached()
      const unknown = await page.screenshot({
        fullPage: true,
        animations: "disabled",
      })
      expect(unknown.equals(unmatched)).toBe(true)
    })
  }
})
