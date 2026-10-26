import { type Browser, expect, type Page, test } from "@playwright/test"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Master 4.6: create a service, publish it and see it on /services; edit a
// testimonial and see it on the home page. Specs run serially on the seeded
// cp_e2e. The afterAll hooks delete the service and restore the testimonial
// (`pnpm test:visual` reseeds its own database).

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

/** Public page text, fetched as an anonymous visitor. */
async function publicText(browser: Browser, path: string) {
  const anonymous = await browser.newContext()
  try {
    const page = await anonymous.newPage()
    await page.goto(path)
    return (await page.locator("body").innerText()).replace(/\s+/g, " ")
  } finally {
    await anonymous.close()
  }
}

const SERVICE_TITLE = "E2E Gutter Cleaning"
const SERVICE_SLUG = "e2e-gutter-cleaning"

// A chosen image turns its button into "Change image", so the next one is always first.
async function pickImage(page: Page) {
  await page.getByRole("button", { name: "Choose image" }).first().click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("list").getByRole("button").first().click()
  await dialog.getByRole("button", { name: "Use this image" }).click()
  await expect(dialog).toBeHidden()
}

test("create a service → publish → /services shows it", async ({
  page,
  browser,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor.email, editor.name)
  await page.goto("/admin/services")
  await expect(
    page.getByRole("heading", { level: 1, name: "Services" })
  ).toBeVisible()
  await page.getByRole("link", { name: "New service" }).first().click()
  await expect(page).toHaveURL(/\/admin\/services\/new$/)

  await page.getByRole("textbox", { name: "Name" }).first().fill(SERVICE_TITLE)
  await expect(page.getByRole("textbox", { name: "/services/…" })).toHaveValue(
    SERVICE_SLUG
  )
  await page
    .getByRole("textbox", { name: "Card text" })
    .fill("Gutters, cleared.")
  await page
    .getByRole("textbox", { name: "Banner text" })
    .fill("Clear gutters keep water off your walls.")
  await page
    .getByRole("textbox", { name: "Heading" })
    .fill("About gutter cleaning")
  await pickImage(page)
  await pickImage(page)
  await page
    .getByRole("textbox", { name: /^Item 1/ })
    .first()
    .fill("Downpipes flushed")
  await page.getByRole("button", { name: "Create draft" }).click()

  // The editor opens on the new draft.
  await expect(page).toHaveURL(/\/admin\/services\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole("heading", { level: 1, name: SERVICE_TITLE })
  ).toBeVisible()
  // A draft is invisible to visitors.
  expect(await publicText(browser, "/services")).not.toContain(SERVICE_TITLE)
  expect(await publicText(browser, `/services/${SERVICE_SLUG}`)).not.toContain(
    "About gutter cleaning"
  )

  await page.getByRole("button", { name: "Publish", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Publish changes?" })
  await dialog.getByRole("button", { name: "Publish now" }).click()
  await expect(dialog).toBeHidden()

  await expect
    .poll(async () =>
      (await publicText(browser, "/services")).includes(SERVICE_TITLE)
    )
    .toBe(true)
  expect(await publicText(browser, `/services/${SERVICE_SLUG}`)).toContain(
    "About gutter cleaning"
  )
})

const TESTIMONIAL = "Thomas Murray"
// The seeded quote, read through the API before the edit (the fixture file
// is server-only and cannot be imported into a Playwright spec).
let originalQuote: string | null = null
const EDITED_QUOTE = "E2E edited quote: tidy, quick and friendly."

test("edit a testimonial → home shows the new quote", async ({
  page,
  browser,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor.email, editor.name)
  const seeded = (await (
    await page.request.get("/api/v1/admin/testimonials?pageSize=100")
  ).json()) as { items: { name: string; quote: string }[] }
  originalQuote = seeded.items.find((i) => i.name === TESTIMONIAL)!.quote
  await page.goto("/admin/collections/testimonials")
  await expect(
    page.getByRole("heading", { level: 1, name: "Testimonials" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: `Edit ${TESTIMONIAL}` })
    .first()
    .click()
  const sheet = page.getByRole("dialog", { name: "Testimonial" })
  await sheet.getByRole("textbox", { name: "Quote" }).fill(EDITED_QUOTE)
  await sheet.getByRole("button", { name: "Save" }).click()
  await expect(sheet).toBeHidden()

  await expect
    .poll(async () => (await publicText(browser, "/")).includes(EDITED_QUOTE))
    .toBe(true)
})

type Page_<T> = { items: T[] }

test.afterAll(async ({ browser }) => {
  const { editor } = readFixtures()
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("restore services") },
  })
  try {
    const page = await context.newPage()
    await signIn(page, editor.email, editor.name)
    const headers = { origin: BASE_URL }

    // Delete the service this spec created (and published).
    const services = (await (
      await page.request.get("/api/v1/admin/services?pageSize=100")
    ).json()) as Page_<{ id: string; slug: string; version: number }>
    for (const s of services.items.filter((s) => s.slug === SERVICE_SLUG)) {
      const res = await page.request.delete(
        `/api/v1/admin/services/${s.id}?version=${s.version}`,
        { headers }
      )
      expect(res.status()).toBe(200)
    }

    // Put the testimonial's quote back to the seeded text.
    const list = (await (
      await page.request.get("/api/v1/admin/testimonials?pageSize=100")
    ).json()) as Page_<{
      id: string
      name: string
      initials: string
      quote: string
      rating: number
    }>
    const t = list.items.find((i) => i.name === TESTIMONIAL)
    if (t && originalQuote && t.quote === EDITED_QUOTE) {
      const res = await page.request.put(`/api/v1/admin/testimonials/${t.id}`, {
        headers,
        data: {
          name: t.name,
          initials: t.initials,
          quote: originalQuote,
          rating: t.rating,
        },
      })
      expect(res.status()).toBe(200)
    }
  } finally {
    await context.close()
  }
})
