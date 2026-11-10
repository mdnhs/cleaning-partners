import { type Browser, expect, type Page, test } from "@playwright/test"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Master 4.5: /admin/settings lands on Site; editing the shared "Why choose
// us" section and publishing shows it on the public site. Specs run serially
// on the seeded cp_e2e. The afterAll restores the section, and
// `pnpm test:visual` reseeds its own database.

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

async function signIn(page: Page, email: string, name: string) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(name) })
  ).toBeVisible()
}

const KEY = "sections.whyChooseUs"
const ORIGINAL = "Why Choose Us?"
const EDITED = "Why Households Choose Us"

// The h2 texts in the server's HTML (no browser rendering: what a publish
// changes is in that HTML, and a slow CI runner should not decide the test).
async function publicTitles(browser: Browser) {
  const anonymous = await browser.newContext()
  try {
    const html = await (await anonymous.request.get("/")).text()
    return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
    )
  } finally {
    await anonymous.close()
  }
}

test("/admin/settings opens Identity (site)", async ({ page }) => {
  const { editor } = readFixtures()
  await signIn(page, editor.email, editor.name)
  await page.goto("/admin/settings")
  await expect(page).toHaveURL(/\/admin\/settings\/site$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Identity" })
  ).toBeVisible()
})

test("edit Why choose us → publish → public home shows it", async ({
  page,
  browser,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor.email, editor.name)
  await page.goto(`/admin/settings/${KEY}`)
  await expect(
    page.getByRole("heading", { level: 1, name: "Why choose us" })
  ).toBeVisible()
  const heading = page.getByRole("textbox", { name: "Heading", exact: true })
  await expect(heading).toHaveValue(ORIGINAL)

  await heading.fill(EDITED)
  await expect(page.getByRole("status", { name: /^Save status/ })).toHaveText(
    "Saved",
    { timeout: 10_000 }
  )
  // A draft is invisible to visitors.
  expect(await publicTitles(browser)).not.toContain(EDITED)

  await page.getByRole("button", { name: "Publish", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Publish changes?" })
  await dialog.getByRole("button", { name: "Publish now" }).click()
  await expect(dialog).toBeHidden()

  // The home page refreshes in the background after a publish; a CI runner can
  // take longer than the default 5 s.
  await expect
    .poll(async () => (await publicTitles(browser)).includes(EDITED), {
      timeout: 20_000,
    })
    .toBe(true)
})

// Leaves the section as seeded even under --grep or a failed test (the
// visual run also reseeds cp_e2e).
test.afterAll(async ({ browser }) => {
  const { editor } = readFixtures()
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("restore settings") },
  })
  try {
    const page = await context.newPage()
    await signIn(page, editor.email, editor.name)
    type Dto = {
      version: number
      published: { title: string } & Record<string, unknown>
    }
    const current = (await (
      await page.request.get(`/api/v1/admin/settings/${KEY}`)
    ).json()) as Dto
    const original = { ...current.published, title: ORIGINAL }
    const saved = await page.request.put(
      `/api/v1/admin/settings/${KEY}/draft`,
      {
        headers: { origin: BASE_URL },
        data: { version: current.version, draft: original },
      }
    )
    expect(saved.status()).toBe(200)
    const { version } = (await saved.json()) as { version: number }
    const published = await page.request.post(
      `/api/v1/admin/settings/${KEY}/publish`,
      { headers: { origin: BASE_URL }, data: { version } }
    )
    expect(published.status()).toBe(200)
    await expect
      .poll(async () => (await publicTitles(browser)).includes(ORIGINAL))
      .toBe(true)
  } finally {
    await context.close()
  }
})
