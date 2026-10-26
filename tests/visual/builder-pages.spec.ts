import { expect, test } from "@playwright/test"

import { BUILDER_FIXTURE_HOME_SLUG, BUILDER_FIXTURE_SLUG } from "./builder-slug"
import { freezeMotion } from "./freeze-motion"

// Baselines are macOS renders: CI does not run them.
test.skip(process.platform !== "darwin", "visual baselines are macOS-only")

for (const slug of [BUILDER_FIXTURE_SLUG, BUILDER_FIXTURE_HOME_SLUG]) {
  test(`builder page /p/${slug} is pixel-identical`, async ({ page }) => {
    const response = await page.goto(`/p/${slug}`, { waitUntil: "networkidle" })
    expect(response?.status()).toBe(200)
    await freezeMotion(page)
    await expect(page.locator("[data-consent-banner]")).toHaveCount(0)
    await expect(page).toHaveScreenshot(`p-${slug}.png`, { fullPage: true })
  })
}
