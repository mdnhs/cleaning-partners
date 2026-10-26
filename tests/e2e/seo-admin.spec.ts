import { expect, type Page, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD } from "./fixtures"

// SEO overview, the record sheet, SEO › Defaults and SEO › Redirects
// (Phase 8, master 8.1–8.2).

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

async function signIn(page: Page, email: string) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => url.pathname === "/admin")
}

// Next's proxy adapter sends same-host Locations as relative URLs.
const absolute = (location: string | undefined) =>
  new URL(location ?? "", BASE_URL).href

test("owner adds a redirect in SEO › Redirects; the old address 301s", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  await page.goto("/admin/seo/redirects")
  await expect(
    page.getByRole("heading", { level: 1, name: "Redirects" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Add redirect" }).first().click()
  const dialog = page.getByRole("dialog", { name: "Add redirect" })
  await dialog.getByLabel("Old address").fill("/e2e-old-contact")
  await dialog.getByLabel("New address").fill("/contact")
  await dialog.getByRole("button", { name: "Add redirect" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("table", { name: "Redirects" })).toContainText(
    "/e2e-old-contact"
  )

  const res = await page.request.get("/e2e-old-contact", { maxRedirects: 0 })
  expect(res.status()).toBe(301)
  expect(absolute(res.headers().location)).toBe(`${BASE_URL}/contact`)

  await page
    .getByRole("button", { name: "Delete redirect from /e2e-old-contact" })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click()
  // The seed has no other redirect, so the table gives way to the empty
  // state: check the row's action is gone rather than the table's text.
  await expect(
    page.getByRole("button", { name: "Delete redirect from /e2e-old-contact" })
  ).toHaveCount(0)
})

test("a redirect turned off stops answering; on again, it 308s (D1.7)", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  const created = await page.request.post("/api/v1/admin/redirects", {
    headers: { origin: BASE_URL },
    data: {
      fromPath: "/e2e-toggle",
      toPath: "/contact",
      code: 308,
      note: "e2e toggle",
    },
  })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()) as { id: string }
  try {
    await page.goto("/admin/seo/redirects?q=e2e-toggle")
    const table = page.getByRole("table", { name: "Redirects" })
    await expect(table).toContainText("e2e toggle")
    await expect(table).toContainText("Never")
    await page
      .getByRole("button", { name: "Turn off redirect from /e2e-toggle" })
      .click()
    await expect(
      page.getByRole("button", { name: "Turn on redirect from /e2e-toggle" })
    ).toBeVisible()
    const off = await page.request.get("/e2e-toggle", { maxRedirects: 0 })
    expect(off.status()).toBe(404)

    await page
      .getByRole("button", { name: "Turn on redirect from /e2e-toggle" })
      .click()
    await expect(
      page.getByRole("button", { name: "Turn off redirect from /e2e-toggle" })
    ).toBeVisible()
    const on = await page.request.get("/e2e-toggle", { maxRedirects: 0 })
    expect(on.status()).toBe(308)
    expect(absolute(on.headers().location)).toBe(`${BASE_URL}/contact`)
  } finally {
    await page.request.delete(`/api/v1/admin/redirects/${id}`, {
      headers: { origin: BASE_URL },
    })
  }
})

test("redirects: a loop is refused inline; CSV exports, and an import reports a bad row", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  const make = (fromPath: string, toPath: string) =>
    page.request.post("/api/v1/admin/redirects", {
      headers: { origin: BASE_URL },
      data: { fromPath, toPath, code: 301 },
    })
  const a = await make("/e2e-loop-a", "/e2e-loop-b")
  expect(a.status()).toBe(201)
  const ids = [((await a.json()) as { id: string }).id]
  try {
    await page.goto("/admin/seo/redirects?q=e2e-")
    await page.getByRole("button", { name: "Add redirect" }).first().click()
    const dialog = page.getByRole("dialog", { name: "Add redirect" })
    await dialog.getByLabel("Old address").fill("/e2e-loop-b")
    await dialog.getByLabel("New address").fill("/e2e-loop-a")
    await dialog.getByRole("button", { name: "Add redirect" }).click()
    await expect(dialog.getByText(/loop/i).first()).toBeVisible()
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard changes" })
      .click()
      .catch(() => {})
    await expect(dialog).toBeHidden()

    const csv = await page.request.get("/api/v1/admin/redirects/export.csv")
    expect(csv.status()).toBe(200)
    expect(await csv.text()).toContain("/e2e-loop-a")

    await page.getByRole("button", { name: "Import CSV" }).click()
    const imp = page.getByRole("dialog", { name: /Import/ })
    await imp.locator('input[type="file"]').setInputFiles({
      name: "redirects.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "from,to\n/e2e-csv-ok,/contact\nnot-a-path,/contact\n"
      ),
    })
    await expect(imp).toContainText("not-a-path")
    await expect(imp).toContainText("1 to fix")
  } finally {
    const list = await page.request.get("/api/v1/admin/redirects?q=e2e-")
    if (list.ok()) {
      const body = (await list.json()) as { items?: { id: string }[] }
      for (const r of body.items ?? []) ids.push(r.id)
    }
    for (const id of new Set(ids))
      await page.request.delete(`/api/v1/admin/redirects/${id}`, {
        headers: { origin: BASE_URL },
      })
  }
})

test("SEO overview: the sheet saves a page's description", async ({ page }) => {
  await signIn(page, E2E_OWNER.email)
  // All: Terms may pass every check (Needs work would hide it).
  await page.goto("/admin/seo?show=all")
  await page.getByRole("button", { name: "Edit SEO for Terms of use" }).click()
  const sheet = page.getByRole("dialog", { name: "SEO: Terms of use" })
  const description = sheet.getByRole("textbox", { name: /^Description/ })
  const before = await description.inputValue()
  try {
    await description.fill(
      "The terms that apply when you use the Cleaning Partners website."
    )
    await sheet.getByRole("button", { name: "Save SEO" }).click()
    await expect(sheet).toBeHidden()
    const head = await (await page.request.get("/terms")).text()
    expect(head).toContain(
      'content="The terms that apply when you use the Cleaning Partners website."'
    )
  } finally {
    // A failed save leaves the sheet open with unsaved edits: close it
    // (Esc, then confirm the discard) so the restore can reopen it.
    if (await sheet.isVisible()) {
      await page.keyboard.press("Escape")
      const discard = page
        .getByRole("alertdialog", { name: "Discard your SEO changes?" })
        .getByRole("button", { name: "Discard changes" })
      await discard
        .waitFor({ timeout: 2_000 })
        .then(() => discard.click())
        .catch(() => {})
      await expect(sheet).toBeHidden()
    }
    // restore
    await page
      .getByRole("button", { name: "Edit SEO for Terms of use" })
      .click()
    const again = page.getByRole("dialog", { name: "SEO: Terms of use" })
    const field = again.getByRole("textbox", { name: /^Description/ })
    // Save is disabled while nothing changed (the first save failed before
    // writing): then there is nothing to restore, just close the sheet.
    if ((await field.inputValue()) !== before) {
      await field.fill(before)
      await again.getByRole("button", { name: "Save SEO" }).click()
    } else {
      await page.keyboard.press("Escape")
    }
    await expect(again).toBeHidden()
  }
})

test("SEO overview: alt-text card, Needs work / All, Fix links to the editor's SEO tab", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  await page.goto("/admin/seo")
  const alt = page.getByRole("region", { name: "Alt text" })
  await expect(alt).toContainText(
    /\d+ of \d+ images described · \d+ decorative/
  )
  await expect(
    alt.getByRole("link", { name: "Find images without alt text" })
  ).toHaveAttribute("href", "/admin/media?missingAlt=true")

  const filter = page.getByRole("navigation", { name: "Issue filter" })
  await expect(
    filter.getByRole("link", { name: "Needs work" })
  ).toHaveAttribute("aria-current", "page")
  // Needs work never says "All checks pass"; All lists the passing records.
  await expect(page.getByText("All checks pass")).toHaveCount(0)
  await filter.getByRole("link", { name: "All" }).click()
  await page.waitForURL((url) => url.searchParams.get("show") === "all")
  await expect(filter.getByRole("link", { name: "All" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  await filter.getByRole("link", { name: "Needs work" }).click()
  await page.waitForURL((url) => !url.searchParams.has("show"))
  // The filter pushes history entries (review D1.5 M4): Back returns to All.
  await page.goBack()
  await page.waitForURL((url) => url.searchParams.get("show") === "all")
  await expect(filter.getByRole("link", { name: "All" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  await page.goForward()
  await page.waitForURL((url) => !url.searchParams.has("show"))

  // The seed has issues (services' images lack alt text, D1.2 report):
  // the first record Fix lands on that editor's SEO tab.
  const fix = page
    .getByRole("link", { name: /^Fix / })
    .and(page.locator('[href*="?tab=seo"]'))
    .first()
  const href = await fix.getAttribute("href")
  expect(href).toMatch(/^\/admin\/(pages|services|blog)\/.+\?tab=seo$/)
  await fix.click()
  await page.waitForURL((url) => url.searchParams.get("tab") === "seo")
  // The SEO tab itself is asserted by seo-tab.spec.ts (SEO tab task).
})

async function publishDraft(page: Page) {
  await expect(page.getByRole("status", { name: /^Save status/ })).toHaveText(
    "Saved",
    { timeout: 10_000 }
  )
  await page.getByRole("button", { name: "Publish", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Publish changes?" })
  await dialog.getByRole("button", { name: "Publish now" }).click()
  await expect(dialog).toBeHidden()
}

test("SEO overview: the sheet saves a page title and the public title follows", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  await page.goto("/admin/seo?show=all")
  const open = page.getByRole("button", { name: "Edit SEO for Privacy policy" })
  await open.click()
  const sheet = page.getByRole("dialog", { name: "SEO: Privacy policy" })
  const title = sheet.getByRole("textbox", { name: /^Title/ })
  const before = await title.inputValue()
  const typed = "E2E privacy title"
  try {
    await title.fill(typed)
    await sheet.getByRole("button", { name: "Save SEO" }).click()
    await expect(sheet).toBeHidden()
    await expect
      .poll(async () => await (await page.request.get("/privacy")).text())
      .toContain(`<title>${typed}`)
  } finally {
    if (await sheet.isVisible()) {
      await page.keyboard.press("Escape")
      const discard = page
        .getByRole("alertdialog", { name: "Discard your SEO changes?" })
        .getByRole("button", { name: "Discard changes" })
      await discard
        .waitFor({ timeout: 2_000 })
        .then(() => discard.click())
        .catch(() => {})
      await expect(sheet).toBeHidden()
    }
    await open.click()
    const again = page.getByRole("dialog", { name: "SEO: Privacy policy" })
    const field = again.getByRole("textbox", { name: /^Title/ })
    if ((await field.inputValue()) !== before) {
      await field.fill(before)
      await again.getByRole("button", { name: "Save SEO" }).click()
    } else {
      await page.keyboard.press("Escape")
    }
    await expect(again).toBeHidden()
  }
})

test("SEO › Defaults: hiding the site from search is published and restored", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  await page.goto("/admin/seo/defaults")
  await expect(
    page.getByRole("heading", { level: 1, name: "SEO defaults" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "What crawlers see" })
  ).toBeVisible()
  const hide = page.getByRole("radio", {
    name: "Hide the whole site from search",
  })
  const show = page.getByRole("radio", {
    name: "Show the site in search results",
  })
  await expect(show).toBeChecked()
  const noindex = async () =>
    (await (await page.request.get("/contact")).text()).includes(
      'name="robots" content="noindex'
    )
  let hidden = false
  try {
    await hide.check()
    hidden = true
    await publishDraft(page)
    await expect.poll(noindex).toBe(true)
  } finally {
    // Only undo what this test did: an earlier failure stays visible.
    if (hidden) {
      await page.goto("/admin/seo/defaults")
      await page
        .getByRole("radio", { name: "Show the site in search results" })
        .check()
      await publishDraft(page)
      await expect.poll(noindex).toBe(false)
    }
  }
})
