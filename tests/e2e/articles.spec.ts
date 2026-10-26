import { type Browser, expect, type Page, test } from "@playwright/test"

import type { ArticleDto } from "@/lib/schemas/api/articles"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Master 5.3 (R5-4, B2): an author drafts and submits; publishing via
// the API is refused; an editor publishes from the review queue; the article
// is then on /blog and at /blog/<slug>. Runs on the seeded cp_e2e; afterAll deletes the article and restores the
// category flag (`pnpm test:visual` reseeds its own database).

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

const TITLE = "E2E Spring Clean Checklist"
const SLUG = "e2e-spring-clean-checklist"
const BODY = "Wipe every surface and empty every bin before you leave."

const saveStatus = (page: Page) =>
  page.getByRole("status", { name: /^Save status/ })
const badge = (page: Page) =>
  page.getByRole("main").locator('[data-slot="status-pill"]').first()

async function visitor(browser: Browser) {
  const context = await browser.newContext()
  return { context, page: await context.newPage() }
}

test("author drafts and submits, cannot publish via the API; an editor publishes; the blog shows it", async ({
  page,
  browser,
}, testInfo) => {
  const { author, editor } = readFixtures()

  // Author: new draft.
  await signIn(page, author)
  await page.goto("/admin/blog/new")
  await page.getByRole("textbox", { name: "Title" }).fill(TITLE)
  await expect(page.getByRole("textbox", { name: "Address" })).toHaveValue(SLUG)
  await page
    .getByRole("textbox", { name: "Excerpt" })
    .fill("Ten checks our team makes on every spring clean.")
  // shadcn Select (MK parity A6): open the combobox, pick the option.
  await page.getByRole("combobox", { name: "Category", exact: true }).click()
  await page.getByRole("option", { name: "Commercial" }).click()
  await page.getByRole("button", { name: "Choose image: Cover image" }).click()
  const picker = page.getByRole("dialog", { name: "Choose: Cover image" })
  await picker.getByRole("list").getByRole("button").first().click()
  await picker.getByRole("button", { name: "Use this image" }).click()
  await expect(picker).toBeHidden()
  await page.getByRole("button", { name: "Create draft" }).click()
  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE })
  ).toBeVisible()
  await expect(badge(page)).toHaveText("Draft")

  // Author: write, autosave, submit. No Publish/Schedule for authors.
  await page.getByRole("textbox", { name: "Article text" }).click()
  await page.keyboard.type(BODY)
  await expect(saveStatus(page)).toHaveText("Saved", { timeout: 10_000 })
  await expect(
    page.getByRole("button", { name: "Publish", exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Schedule" })).toHaveCount(0)
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(badge(page)).toHaveText("In review")

  // Review Focus 5 through the API: the same request path accepts the
  // author's draft save but refuses their publish.
  const id = new URL(page.url()).pathname.split("/").pop()!
  const headers = { origin: BASE_URL }
  const current = (await (
    await page.request.get(`/api/v1/admin/articles/${id}`)
  ).json()) as ArticleDto
  const save = await page.request.put(`/api/v1/admin/articles/${id}/draft`, {
    headers,
    data: { draft: current.draft, version: current.version },
  })
  expect(save.status()).toBe(200)
  const { version } = (await save.json()) as ArticleDto
  const publish = await page.request.post(
    `/api/v1/admin/articles/${id}/publish`,
    { headers, data: { version } }
  )
  expect(publish.status()).toBe(403)
  expect(
    ((await publish.json()) as { error: { code: string } }).error.code
  ).toBe("FORBIDDEN")

  // Not on the site yet.
  const anon = await visitor(browser)
  await anon.page.goto(`/blog/${SLUG}`)
  await expect(
    anon.page.getByRole("heading", { level: 1, name: TITLE })
  ).toHaveCount(0)

  // Editor: review queue → publish.
  const editorContext = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": clientIpFor(`${testInfo.title} editor`),
    },
  })
  const editorPage = await editorContext.newPage()
  await signIn(editorPage, editor)
  await editorPage.goto("/admin/blog")
  await editorPage.getByRole("button", { name: "Review queue" }).click()
  await editorPage.getByRole("link", { name: TITLE }).click()
  await expect(
    editorPage.getByRole("heading", { level: 1, name: TITLE })
  ).toBeVisible()
  await editorPage.getByRole("button", { name: "Publish", exact: true }).click()
  await editorPage
    .getByRole("dialog", { name: "Publish changes?" })
    .getByRole("button", { name: "Publish now" })
    .click()
  await expect(
    editorPage.getByText("The site shows the new version now.")
  ).toBeVisible()
  await expect(badge(editorPage)).toHaveText("Published")
  await editorContext.close()

  // Public: the newest article leads /blog (its featured card, a level-2
  // heading), and has its own page.
  await anon.page.goto("/blog")
  await expect(
    anon.page.getByRole("heading", { level: 2, name: TITLE })
  ).toBeVisible()
  await anon.page.goto(`/blog/${SLUG}`)
  await expect(
    anon.page.getByRole("heading", { level: 1, name: TITLE })
  ).toBeVisible()
  await expect(anon.page.getByText(BODY)).toBeVisible()
  await anon.context.close()
})

const CATEGORY = "Retail"

test("the Retail category's filter switch is reflected on /blog", async ({
  page,
  browser,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor)
  await page.goto("/admin/blog/categories")
  await expect(
    page.getByRole("heading", { level: 1, name: "Categories" })
  ).toBeVisible()

  const filter = (p: Page) =>
    p.getByRole("group", { name: "Filter by category" })
  const anon = await visitor(browser)
  await anon.page.goto("/blog")
  await expect(
    filter(anon.page).getByRole("button", { name: CATEGORY })
  ).toBeVisible()

  await page
    .getByRole("button", { name: `Edit ${CATEGORY}` })
    .first()
    .click()
  const sheet = page.getByRole("dialog", { name: "Category" })
  await sheet.getByRole("switch", { name: "Show in the blog filter" }).click()
  await sheet.getByRole("button", { name: "Save" }).click()
  await expect(sheet).toBeHidden()

  await expect(async () => {
    await anon.page.goto("/blog")
    await expect(
      filter(anon.page).getByRole("button", { name: "Commercial" })
    ).toBeVisible({ timeout: 2_000 })
    await expect(
      filter(anon.page).getByRole("button", { name: CATEGORY })
    ).toHaveCount(0)
  }).toPass({ timeout: 30_000 })
  await anon.context.close()
})

test("a category that has articles cannot be deleted (409)", async ({
  page,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor)
  const list = (await (
    await page.request.get("/api/v1/admin/categories?pageSize=100")
  ).json()) as { items: { id: string; name: string }[] }
  const commercial = list.items.find((c) => c.name === "Commercial")!
  const res = await page.request.delete(
    `/api/v1/admin/categories/${commercial.id}`,
    { headers: { origin: BASE_URL } }
  )
  expect(res.status()).toBe(409)
})

test.afterAll(async ({ browser }) => {
  const { editor } = readFixtures()
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("restore articles") },
  })
  try {
    const page = await context.newPage()
    await signIn(page, editor)
    const headers = { origin: BASE_URL }
    const articles = (await (
      await page.request.get("/api/v1/admin/articles?pageSize=100")
    ).json()) as { items: { id: string; slug: string; version: number }[] }
    for (const a of articles.items.filter((a) => a.slug === SLUG)) {
      const res = await page.request.delete(
        `/api/v1/admin/articles/${a.id}?version=${a.version}`,
        { headers }
      )
      expect(res.status()).toBe(200)
    }
    const cats = (await (
      await page.request.get("/api/v1/admin/categories?pageSize=100")
    ).json()) as {
      items: { id: string; slug: string; name: string; showInFilter: boolean }[]
    }
    for (const c of cats.items.filter((c) => !c.showInFilter)) {
      const res = await page.request.put(`/api/v1/admin/categories/${c.id}`, {
        headers,
        data: { slug: c.slug, name: c.name, showInFilter: true },
      })
      expect(res.status()).toBe(200)
    }
  } finally {
    await context.close()
  }
})
