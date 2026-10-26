import { expect, type Page, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD } from "./fixtures"

// R9-2: a published, non-default brand reaches the public site as a :root
// override; restoring the default removes it again.

const SAME_ORIGIN = { origin: BASE_URL }
const BRAND = "#5888b6"

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

type ThemeDto = {
  draft: { site: Record<string, unknown> }
  version: number
}

async function publishBrand(page: Page, brand: string | null) {
  const dto = (await (
    await page.request.get("/api/v1/admin/appearance")
  ).json()) as ThemeDto
  const saved = await page.request.put("/api/v1/admin/appearance/draft", {
    headers: SAME_ORIGIN,
    data: {
      version: dto.version,
      draft: { ...dto.draft, site: { ...dto.draft.site, brand } },
    },
  })
  expect(saved.status()).toBe(200)
  const { version } = (await saved.json()) as { version: number }
  const published = await page.request.post(
    "/api/v1/admin/appearance/publish",
    { headers: SAME_ORIGIN, data: { version } }
  )
  expect(published.status()).toBe(200)
}

test("a published brand overrides the public colours; the default restores", async ({
  page,
  browser,
}) => {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(E2E_OWNER.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => url.pathname === "/admin")
  const brandColour = (site: Page) =>
    site.evaluate(() => {
      const probe = document.createElement("div")
      probe.style.color = "var(--color-brand)"
      document.body.appendChild(probe)
      const value = getComputedStyle(probe).color
      probe.remove()
      return value
    })
  let overridden = ""
  try {
    await publishBrand(page, BRAND)
    const visitor = await browser.newContext()
    const site = await visitor.newPage()
    await site.goto("/", { waitUntil: "load" })
    const css = await site.locator("style#site-theme").textContent()
    expect(css).toMatch(/^:root\{--color-brand:/)
    await expect(site.locator("style#site-theme-extras")).toHaveCount(1)
    overridden = await brandColour(site)
    expect(overridden).not.toBe("")
    await visitor.close()
  } finally {
    await publishBrand(page, null)
  }
  const after = await browser.newContext()
  const site = await after.newPage()
  await site.goto("/", { waitUntil: "load" })
  await expect(site.locator("style#site-theme")).toHaveCount(0)
  expect(await brandColour(site)).not.toBe(overridden)
  await after.close()
})
