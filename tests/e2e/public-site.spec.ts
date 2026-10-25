import { expect, test } from "@playwright/test"

import { PUBLIC_URLS } from "../visual/urls"

// The public site served from the seeded cp_e2e database (tests/e2e/seed.ts).

const PAGES = PUBLIC_URLS.filter((url) => url !== "/this-page-does-not-exist")

test.describe("public site from the database", () => {
  for (const url of PAGES) {
    test(`${url} returns 200 with no console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(err.message))
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text())
      })
      const response = await page.goto(url, { waitUntil: "networkidle" })
      expect(response?.status()).toBe(200)
      await expect(page.locator("h1").first()).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test("an unmatched URL is a real 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist")
    expect(response?.status()).toBe(404)
  })

  for (const [path, title] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms and Conditions"],
  ] as const) {
    test(`${path} renders with the site's PageHero`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator("[data-hero] h1")).toHaveText(title)
      await expect(
        page.getByRole("navigation", { name: "Breadcrumb" })
      ).toBeVisible()
      await expect(page.locator("article h2").first()).toBeVisible()
      await expect(page).toHaveTitle(`${title} | Cleaning Partners Ltd.`)
    })
  }

  test("footer legal links point at /privacy and /terms", async ({ page }) => {
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(
      footer.getByRole("link", { name: "Privacy Policy" })
    ).toHaveAttribute("href", "/privacy")
    await expect(
      footer.getByRole("link", { name: "Terms", exact: true })
    ).toHaveAttribute("href", "/terms")
  })
})

test.describe("GSAP motion still initialises on DB-rendered markup", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } })

  for (const path of ["/", "/services/medical-cleaning"]) {
    test(`motion on ${path}`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(err.message))
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text())
      })
      await page.goto(path)
      // CSS hides [data-intro] pieces (visibility) until GSAP's hero intro
      // reveals them; SplitText then splits the hero title into characters.
      await expect(page.locator("[data-hero-title]").first()).toHaveCSS(
        "visibility",
        "visible"
      )
      await expect(
        page.locator("[data-hero-title] > div").first()
      ).toBeAttached()
      expect(errors).toEqual([])
    })
  }
})
