import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test"

import { BASE_URL } from "../e2e/env"
import { clientIpFor } from "../e2e/fixtures"

import { VISUAL_ADMIN } from "./admin-user"
import { freezeMotion } from "./freeze-motion"

// Baselines are macOS renders: CI runs E2E only.
test.skip(process.platform !== "darwin", "visual baselines are macOS-only")

// The consent banner's own baselines (R11-7), separate from the 44 public
// ones. Those never show it: tracking is seeded off and the banner renders
// only while tracking is enabled. These tests switch tracking on (no tag ids,
// so nothing loads) for a fresh visitor and put the settings back exactly in
// afterAll, so public-pages.spec.ts still sees the seeded state.

const SAME_ORIGIN = { origin: BASE_URL }

type Tracking = Record<string, unknown>
type TrackingDto = {
  draft: Tracking
  published: Tracking | null
  version: number
}

async function signIn(page: Page) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(VISUAL_ADMIN.email)
  await page.getByLabel("Password", { exact: true }).fill(VISUAL_ADMIN.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => url.pathname === "/admin")
}

async function readTracking(request: APIRequestContext) {
  const response = await request.get("/api/v1/admin/marketing/tracking")
  expect(response.status()).toBe(200)
  return (await response.json()) as TrackingDto
}

async function saveDraft(
  request: APIRequestContext,
  draft: Tracking
): Promise<number> {
  const { version } = await readTracking(request)
  const saved = await request.put("/api/v1/admin/marketing/tracking/draft", {
    headers: SAME_ORIGIN,
    data: { draft, version },
  })
  expect(saved.status()).toBe(200)
  return ((await saved.json()) as { version: number }).version
}

async function publishDraft(request: APIRequestContext, draft: Tracking) {
  const version = await saveDraft(request, draft)
  const published = await request.post(
    "/api/v1/admin/marketing/tracking/publish",
    { headers: SAME_ORIGIN, data: { version } }
  )
  expect(published.status()).toBe(200)
}

test.describe.serial("consent banner (tracking on)", () => {
  let admin: Page
  let before: TrackingDto

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": clientIpFor(
          `visual consent banner ${testInfo.project.name}`
        ),
      },
    })
    admin = await context.newPage()
    await signIn(admin)
    before = await readTracking(admin.request)
    // Tracking on, every channel off and no tag ids: nothing loads.
    await publishDraft(admin.request, {
      ...before.draft,
      enabled: true,
      gtmEnabled: false,
      gtmId: null,
      ga4Enabled: false,
      ga4Id: null,
      metaEnabled: false,
      metaPixelId: null,
    })
  })

  test.afterAll(async () => {
    try {
      // The live settings first, then the draft as it was (they differ only
      // when an unpublished draft was pending).
      await publishDraft(admin.request, before.published ?? before.draft)
      if (
        before.published &&
        JSON.stringify(before.published) !== JSON.stringify(before.draft)
      )
        await saveDraft(admin.request, before.draft)
    } finally {
      await admin.context().close()
    }
  })

  test("first visit, customise, and the reopen button", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" })
    await freezeMotion(page)
    const banner = page.locator("[data-consent-banner]")
    await expect(banner).toBeVisible()
    await expect(banner).toHaveScreenshot("consent-banner.png")

    await banner.getByRole("button", { name: "Customise" }).click()
    await expect(
      banner.getByRole("checkbox", { name: /Necessary/ })
    ).toBeDisabled()
    await expect(banner).toHaveScreenshot("consent-banner-customise.png")

    await banner.getByRole("button", { name: "Save choices" }).click()
    await expect(banner).toBeHidden()
    const manage = page.getByRole("button", { name: "Cookie settings" })
    await expect(manage).toBeVisible()
    await expect(manage).toHaveScreenshot("consent-manage-button.png")
  })
})
