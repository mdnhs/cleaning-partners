import { expect, type Page, test } from "@playwright/test"

import { assistantOnHomeEditor, SAVED_SMTP } from "./ai-pins"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Phase 4 shell, measured in a real browser: the nav groups per role, the
// sheet below 1024 px, the website card, the dock, ⌘K, the impersonation
// banner, and a topbar that never overflows from 1024 px down to a phone.

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

async function signIn(page: Page, who: { email: string; name: string }) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(who.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(who.name) })
  ).toBeVisible()
}

/** Every topbar control lies inside the topbar, which does not scroll. */
async function expectTopbarFits(page: Page) {
  const topbar = page.locator("[data-slot=topbar]")
  const fits = await topbar.evaluate((bar) => {
    const box = bar.getBoundingClientRect()
    const inside = [...bar.querySelectorAll("a, button")]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .every((el) => {
        const r = el.getBoundingClientRect()
        return r.left >= box.left - 0.5 && r.right <= box.right + 0.5
      })
    return { inside, scroll: bar.scrollWidth <= bar.clientWidth }
  })
  expect(fits).toEqual({ inside: true, scroll: true })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
}

test("sidebar: the owner sees every group; Blog and Testimonials are listed", async ({
  page,
}) => {
  const { owner } = readFixtures()
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, owner)
  const sidebar = page.locator("[data-slot=sidebar]")
  for (const label of [
    "Dashboard",
    "Pages",
    "Blog",
    "Services",
    "Collections",
    "Media",
    "Enquiries",
  ])
    await expect(
      sidebar.getByRole("link", { name: new RegExp(`^${label}`) }).first()
    ).toBeVisible()
  // Testimonials is a Collections sub-page: ⌘K lists it from the registry.
  await page.keyboard.press("ControlOrMeta+k")
  await expect(page.getByRole("dialog").getByRole("combobox")).toBeVisible()
  await page.getByRole("dialog").getByRole("combobox").fill("testimonials")
  await expect(
    page
      .getByRole("dialog")
      .getByRole("option", { name: "Testimonials, in Collections" })
  ).toBeVisible()
})

test("sidebar: an editor sees content sections only", async ({ page }) => {
  const { editor } = readFixtures()
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, editor)
  const sidebar = page.locator("[data-slot=sidebar]")
  await expect(sidebar.getByRole("link", { name: /^Pages/ })).toBeVisible()
  await expect(sidebar.getByRole("link", { name: /^Blog/ })).toBeVisible()
  // No settings or users sections for an editor.
  await expect(sidebar.getByRole("link", { name: /^Settings/ })).toHaveCount(0)
})

test("website card shows the site host; the dock has its four controls", async ({
  page,
}) => {
  const { owner } = readFixtures()
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, owner)
  const card = page.locator("[data-slot=sidebar]")
  // settings.site.productionUrl is unset in the seed: the env origin shows.
  await expect(card.locator("[data-slot=website-host]")).toHaveText(
    new URL(BASE_URL).host
  )
  await expect(
    card.getByRole("link", { name: /^Open site/ }).first()
  ).toHaveAttribute("href", BASE_URL)
  const dock = card.getByRole("navigation", { name: "Administration" }).first()
  for (const label of ["Users & roles", "Activity log", "Help"])
    await expect(dock.getByRole("link", { name: label })).toBeVisible()
  await expect(dock.getByRole("button", { name: "Log out" })).toBeVisible()
})

test("below 1024 px the nav is a sheet opened from the topbar", async ({
  page,
}) => {
  const { owner } = readFixtures()
  await page.setViewportSize({ width: 900, height: 800 })
  await signIn(page, owner)
  await expect(page.locator("[data-slot=sidebar-container]")).toBeHidden()
  await page.getByRole("button", { name: "Toggle navigation" }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("link", { name: /^Services/ })).toBeVisible()
  await sheet.getByRole("link", { name: /^Services/ }).click()
  await expect(page).toHaveURL(/\/admin\/services/)
})

test("⌘K opens, searches CP records and navigates", async ({ page }) => {
  const { owner } = readFixtures()
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, owner)
  await page.keyboard.press("ControlOrMeta+k")
  const dialog = page.getByRole("dialog")
  const input = dialog.getByRole("combobox")
  await expect(input).toBeVisible()
  await input.fill("retail")
  await expect(
    dialog.getByRole("option", { name: /Retail Cleaning/ }).first()
  ).toBeVisible()
  await input.fill("murray")
  await expect(
    dialog.getByRole("option", { name: /Thomas Murray/ })
  ).toBeVisible()
  await dialog.getByRole("option", { name: /Thomas Murray/ }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/testimonials\?edit=/)
})

test("impersonating shows the banner with a stop control", async ({ page }) => {
  const { owner, editor } = readFixtures()
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, owner)
  const status = await page.evaluate(async (email) => {
    const list = await fetch(`/api/v1/admin/users?pageSize=100`).then((r) =>
      r.json()
    )
    const target = list.items.find((u: { email: string }) => u.email === email)
    const res = await fetch(`/api/v1/admin/users/${target.id}/impersonate`, {
      method: "POST",
    })
    return res.status
  }, editor.email)
  expect(status).toBe(200)
  await page.goto("/admin")
  await expect(
    page.getByText(`You are viewing the admin as ${editor.name}.`, {
      exact: false,
    })
  ).toBeVisible()
  await page.getByRole("button", { name: "Stop impersonating" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(owner.name) })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Stop impersonating" })
  ).toHaveCount(0)
})

test("topbar fits at 1024 px with role chip, AI, mail and bell", async ({
  page,
}) => {
  const { owner } = readFixtures()
  await page.setViewportSize({ width: 1024, height: 768 })
  await signIn(page, owner)
  // The seed has no AI integration, so the owner sees the set-up button and
  // the status query never refetches on its own: turn it on the way Settings
  // does (pinned status, no provider), then measure the topbar.
  await assistantOnHomeEditor(page, SAVED_SMTP)
  const topbar = page.locator("[data-slot=topbar]")
  await expect(
    topbar.getByRole("button", { name: "AI assistant" })
  ).toBeVisible()
  await expect(topbar.getByRole("link", { name: /^Enquiries/ })).toBeVisible()
  await expect(
    topbar.getByRole("button", { name: /^Account menu for / })
  ).toBeVisible()
  await expectTopbarFits(page)
  // The search pill keeps at least its 44 px target.
  const pill = (await topbar
    .getByRole("button", { name: /Search/ })
    .boundingBox())!
  expect(pill.width).toBeGreaterThanOrEqual(44)
})

for (const width of [360, 390]) {
  test(`phone topbar at ${width} px shows the mail link and fits`, async ({
    page,
  }) => {
    const { owner } = readFixtures()
    await page.setViewportSize({ width, height: 800 })
    await signIn(page, owner)
    const mail = page
      .locator("[data-slot=topbar]")
      .getByRole("link", { name: /^Enquiries/ })
    await expect(mail).toBeVisible()
    const box = (await mail.boundingBox())!
    expect(Math.round(box.width)).toBe(44)
    expect(Math.round(box.height)).toBe(44)
    await expectTopbarFits(page)
  })
}
