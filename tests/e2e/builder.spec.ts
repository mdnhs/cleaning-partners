import { type Browser, expect, type Page, test } from "@playwright/test"

import { E2E_MARKETER } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, readFixtures } from "./fixtures"

// R10-12, R10-14, R10-11: the custom pages list, the builder end to end, the
// stale-version conflict, the rename redirect, ⌘K and "Copy to new page".
// Every page a test makes is deleted in its `finally`.

const headers = { origin: BASE_URL }
const API = "/api/v1/admin/builder-pages"

type Dto = { id: string; slug: string; version: number }
type Who = { email: string }

async function signIn(browser: Browser, tag: string, who?: Who) {
  const account = who ?? readFixtures().editor
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor(tag) },
  })
  const page = await context.newPage()
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"))
  return { context, page }
}

/** Deletes the pages at these addresses, whatever state the test stopped in. */
async function removePages(page: Page, slugs: string[]) {
  const res = await page.request.get(`${API}?pageSize=100`)
  if (res.status() !== 200) return
  const { items } = (await res.json()) as { items: Dto[] }
  for (const item of items.filter((i) => slugs.includes(i.slug)))
    await page.request.delete(`${API}/${item.id}?version=${item.version}`, {
      headers,
    })
}

const stats = (value: string, label: string) => ({
  id: "stats-1",
  type: "stats",
  anchor: "stats",
  hidden: false,
  data: { items: [{ value, label }] },
})

async function createWithStats(page: Page, slug: string, title: string) {
  const res = await page.request.post(API, {
    headers,
    data: { slug, title, seed: { blocks: [stats("10", "Mine")] } },
  })
  expect(res.status()).toBe(201)
  return (await res.json()) as Dto
}

const saveStatus = (page: Page) =>
  page.getByRole("status", { name: /^Save status/ })

test("an editor builds, publishes and views a page", async ({ browser }) => {
  const slug = "spring-clean"
  const { context, page } = await signIn(browser, "builder create")
  try {
    await removePages(page, [slug])
    await page.goto("/admin/pages")
    await page.getByRole("button", { name: "New page" }).click()
    const dialog = page.getByRole("dialog", { name: "New page" })
    await dialog.getByLabel("Title").fill("Spring clean")
    await expect(dialog.getByLabel("Address")).toHaveValue(slug)
    await dialog.getByRole("button", { name: "Create page" }).click()
    await page.waitForURL(/\/admin\/pages\/custom\/[^/]+$/)

    await page.getByRole("button", { name: "Add block" }).click()
    await page
      .getByRole("dialog", { name: "Add a block" })
      .getByRole("button", { name: "Stats" })
      .click()
    const stat = page.getByRole("listitem", { name: "Stat 1" })
    await stat.getByRole("textbox").nth(0).fill("250+")
    await stat.getByRole("textbox").nth(1).fill("Spring cleans done")
    await expect(saveStatus(page)).toHaveText("Saved")

    await page.getByRole("button", { name: "Publish", exact: true }).click()
    await page
      .getByRole("dialog", { name: "Publish changes?" })
      .getByRole("button", { name: "Publish now" })
      .click()
    await expect(
      page.getByText("Published", { exact: true }).first()
    ).toBeVisible()

    const visitor = await browser.newContext()
    try {
      const view = await visitor.newPage()
      const response = await view.goto(`/p/${slug}`)
      expect(response?.status()).toBe(200)
      await expect(view.getByText("250+")).toBeVisible()
      await expect(view.getByText("Spring cleans done")).toBeVisible()
    } finally {
      await visitor.close()
    }
  } finally {
    await removePages(page, [slug])
    await context.close()
  }
})

test("a stale save opens the conflict dialog; reloading takes their version", async ({
  browser,
}) => {
  const slug = "e2e-builder-conflict"
  const mine = await signIn(browser, "builder conflict mine")
  const theirs = await signIn(browser, "builder conflict theirs")
  try {
    await removePages(mine.page, [slug])
    const dto = await createWithStats(mine.page, slug, "E2E conflict")
    await mine.page.goto(`/admin/pages/custom/${dto.id}`)
    const value = mine.page
      .getByRole("listitem", { name: "Stat 1" })
      .getByRole("textbox")
      .nth(0)
    await expect(value).toHaveValue("10")

    const saved = await theirs.page.request.put(`${API}/${dto.id}/draft`, {
      headers,
      data: {
        draft: { blocks: [stats("THEIRS", "Theirs")] },
        version: dto.version,
      },
    })
    expect(saved.status()).toBe(200)

    await value.fill("MINE")
    const conflict = mine.page.getByRole("alertdialog", {
      name: "Someone else changed this",
    })
    await expect(conflict).toBeVisible()
    await conflict.getByRole("button", { name: "Reload their version" }).click()
    await expect(conflict).toBeHidden()
    await expect(value).toHaveValue("THEIRS")
  } finally {
    await removePages(mine.page, [slug])
    await mine.context.close()
    await theirs.context.close()
  }
})

test("renaming a published page's address redirects the old one (301)", async ({
  browser,
}) => {
  const slug = "e2e-builder-before"
  const renamed = "e2e-builder-after"
  const { context, page } = await signIn(browser, "builder rename")
  try {
    await removePages(page, [slug, renamed])
    const dto = await createWithStats(page, slug, "E2E rename")
    const published = await page.request.post(`${API}/${dto.id}/publish`, {
      headers,
      data: { version: dto.version },
    })
    expect(published.status()).toBe(200)
    await page.goto(`/admin/pages/custom/${dto.id}?tab=seo`)
    await page.getByLabel("Address", { exact: true }).fill(renamed)
    const meta = page.waitForResponse(
      (r) =>
        r.url().endsWith(`${API}/${dto.id}/meta`) &&
        r.request().method() === "PATCH"
    )
    await page.getByRole("button", { name: "Save title and address" }).click()
    expect((await meta).status()).toBe(200)

    const visitor = await browser.newContext()
    try {
      const old = await visitor.request.get(`/p/${slug}`, { maxRedirects: 0 })
      expect(old.status()).toBe(301)
      expect(old.headers()["location"]).toContain(`/p/${renamed}`)
      expect((await visitor.request.get(`/p/${renamed}`)).status()).toBe(200)
    } finally {
      await visitor.close()
    }
  } finally {
    await removePages(page, [slug, renamed])
    await context.close()
  }
})

test("a marketer sees the list read-only", async ({ browser }) => {
  const slug = "e2e-builder-readonly"
  const editor = await signIn(browser, "builder readonly editor")
  const marketer = await signIn(browser, "builder readonly marketer", {
    email: E2E_MARKETER.email,
  })
  try {
    await removePages(editor.page, [slug])
    await createWithStats(editor.page, slug, "E2E read only")
    await marketer.page.goto("/admin/pages")
    await expect(
      marketer.page.getByRole("heading", { name: "Custom pages" })
    ).toBeVisible()
    await expect(
      marketer.page.getByRole("link", { name: "E2E read only" })
    ).toBeVisible()
    await expect(
      marketer.page.getByRole("button", { name: "New page" })
    ).toHaveCount(0)
  } finally {
    await removePages(editor.page, [slug])
    await editor.context.close()
    await marketer.context.close()
  }
})

test("⌘K New page opens the new page dialog", async ({ browser }) => {
  const { context, page } = await signIn(browser, "builder palette")
  try {
    await page.goto("/admin")
    await page.waitForLoadState("networkidle")
    await page.keyboard.press("ControlOrMeta+k")
    const palette = page.getByRole("dialog", { name: "Search the admin" })
    await expect(palette.getByRole("combobox")).toBeVisible()
    await palette.getByRole("option", { name: /^New page/ }).click()
    await expect(page).toHaveURL(/\/admin\/pages\?new=1$/)
    await expect(page.getByRole("dialog", { name: "New page" })).toBeVisible()
  } finally {
    await context.close()
  }
})

test("Copy to new page from Contact creates a page with the four blocks", async ({
  browser,
}) => {
  const slug = "e2e-contact-copy"
  const { context, page } = await signIn(browser, "builder copy")
  try {
    await removePages(page, [slug])
    await page.goto("/admin/pages/contact")
    await page.getByRole("button", { name: "Copy to new page" }).click()
    const dialog = page.getByRole("dialog", { name: "Copy to a new page" })
    await expect(dialog.getByLabel("Title")).toHaveValue("Contact copy")
    await expect(dialog.getByLabel("Address")).toHaveValue("contact-copy")
    await dialog.getByLabel("Address").fill(slug)
    await dialog.getByRole("button", { name: "Create copy" }).click()
    await page.waitForURL(/\/admin\/pages\/custom\/[^/]+$/)

    const id = new URL(page.url()).pathname.split("/").pop()!
    const res = await page.request.get(`${API}/${id}`)
    const dto = (await res.json()) as {
      draft: { blocks: { type: string }[] }
    }
    expect(dto.draft.blocks.map((b) => b.type)).toEqual([
      "hero.page",
      "contact",
      "quoteForm",
      "map",
    ])
  } finally {
    await removePages(page, [slug])
    await context.close()
  }
})
