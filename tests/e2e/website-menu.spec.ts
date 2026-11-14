import { expect, type Page, test } from "@playwright/test"

import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Phase 3: Website replaces Pages, Blog, Services, Careers and Collections in
// the sidebar; the old URLs land on the Website screen that replaced them.

test.beforeEach(async ({ context, page }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
  await page.setViewportSize({ width: 1440, height: 900 })
})

async function signIn(page: Page) {
  const { owner } = readFixtures()
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(owner.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(owner.name) })
  ).toBeVisible()
}

// exact: "Admin" would also match the footer dock ("Administration").
const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Admin", exact: true })

test("the sidebar offers Website, not Pages or Collections", async ({
  page,
}) => {
  await signIn(page)
  const nav = sidebar(page)
  await expect(nav.getByRole("link", { name: /^Website/ })).toBeVisible()
  for (const gone of [
    /^Pages/,
    /^Collections/,
    /^Blog/,
    /^Services/,
    /^Careers/,
  ])
    await expect(nav.getByRole("link", { name: gone })).toHaveCount(0)
})

test("the Website rail lists every screen", async ({ page }) => {
  await signIn(page)
  await page.goto("/admin/website/home")
  const rail = page.getByRole("navigation", { name: "Website", exact: true })
  for (const label of [
    "Home",
    "About",
    "Services",
    "Blog",
    "Contact",
    "Careers",
    "Custom pages",
    "Legal pages",
    "Header & footer",
  ])
    await expect(
      rail.getByRole("link", { name: label, exact: true })
    ).toBeVisible()
})

const MOVED: readonly [from: string, to: RegExp][] = [
  ["/admin/pages", /\/admin\/website\/home$/],
  ["/admin/pages/about", /\/admin\/website\/about$/],
  ["/admin/pages/legal", /\/admin\/website\/legal$/],
  ["/admin/collections/testimonials", /\/admin\/website\/home\/testimonials$/],
  ["/admin/settings/footer", /\/admin\/website\/header-footer\/footer$/],
]

for (const [from, to] of MOVED)
  test(`${from} lands on its Website screen`, async ({ page }) => {
    await signIn(page)
    await page.goto(from)
    await expect(page).toHaveURL(to)
  })

// The redirect keeps the query. A real record id, since the screen drops
// an ?edit id it cannot find.
test("/admin/collections/team?edit=<id> lands on its Website screen", async ({
  page,
}) => {
  await signIn(page)
  const { items } = (await (
    await page.request.get("/api/v1/admin/team?pageSize=1")
  ).json()) as { items: { id: string }[] }
  const id = items[0]!.id
  await page.goto(`/admin/collections/team?edit=${id}`)
  await expect(page).toHaveURL(
    new RegExp(`/admin/website/about/team\\?edit=${id}$`)
  )
  await expect(page.getByRole("dialog", { name: "Team member" })).toBeVisible()
})

// The old "New page" link: the dialog opens on Custom pages.
test("/admin/pages?new=1 opens New page on Custom pages", async ({ page }) => {
  await signIn(page)
  await page.goto("/admin/pages?new=1")
  await expect(page).toHaveURL(/\/admin\/website\/custom-pages\?new=1$/)
  await expect(page.getByRole("dialog", { name: "New page" })).toBeVisible()
})

test("Services keeps Website highlighted", async ({ page }) => {
  await signIn(page)
  await page.goto("/admin/services")
  await expect(
    sidebar(page).getByRole("link", { name: /^Website/ })
  ).toHaveAttribute("aria-current", "page")
  await expect(
    page
      .getByRole("navigation", { name: "Services sections" })
      .getByRole("link", { name: "All services" })
  ).toHaveAttribute("aria-current", "page")
})
