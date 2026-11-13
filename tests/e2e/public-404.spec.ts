import { expect, test } from "@playwright/test"

// A missing page is a real 404 (status 404: unmatched URLs hit
// app/global-not-found.tsx, and the proxy rewrites unknown posts, services,
// jobs and pages to /_cp-missing/404 before anything streams). It renders the
// site's chrome around the copy from settings.microcopy.notFound (seeded as
// "Page not found"), noindex'ed.
//
// There is no notFound() path inside a (site) page that bypasses the proxy
// rewrite: every detail route (/services|blog|careers|p/<slug>, careers apply,
// /<slug>) is checked by proxy.ts first, so app/(site)/not-found.tsx is only
// a backstop and cannot be reached from a browser. Both entries share
// components/not-found-content.tsx, which this covers.
test.describe("missing pages render the branded 404", () => {
  for (const path of [
    "/this-page-does-not-exist",
    "/blog/does-not-exist",
    "/services/no-such-service",
  ]) {
    test(`${path} answers 404 with the configured copy and the site chrome`, async ({
      page,
    }) => {
      const response = await page.goto(path, { waitUntil: "load" })
      expect(response?.status()).toBe(404)
      await expect(
        page.getByRole("heading", { level: 1, name: "Page not found" })
      ).toBeVisible()
      await expect(
        page.getByText(
          "The page you are looking for has moved or no longer exists."
        )
      ).toBeVisible()
      await expect(
        page.getByRole("link", { name: "Back to home" })
      ).toHaveAttribute("href", "/")
      await expect(page.getByRole("banner")).toBeVisible()
      await expect(page.locator("footer")).toBeVisible()
      await expect(
        page.locator('meta[name="robots"][content*="noindex"]').first()
      ).toBeAttached()
    })
  }
})
