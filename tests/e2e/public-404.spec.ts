import { expect, test } from "@playwright/test"

// R3-5: an unknown service or article slug calls notFound() inside Suspense
// (a soft 404: the shell has streamed, so the status stays 200), and must
// render the same branded 404 page as an unmatched URL, noindex'ed.
// Verified in Task 8: no app/(site)/not-found.tsx is needed, Next's built-in
// not-found UI renders under the site layout and is pixel-identical to
// app/global-not-found.tsx (tests/visual: /this-page-does-not-exist).
test.describe("unknown slugs render the site's 404 page", () => {
  for (const path of ["/blog/no-such-article", "/services/no-such-service"]) {
    test(`${path} looks like an unmatched URL`, async ({ page }) => {
      await page.goto("/this-page-does-not-exist", { waitUntil: "networkidle" })
      const unmatched = await page.screenshot({
        fullPage: true,
        animations: "disabled",
      })

      await page.goto(path, { waitUntil: "networkidle" })
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
