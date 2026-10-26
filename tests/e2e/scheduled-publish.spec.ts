import { expect, type Page, test } from "@playwright/test"

import type { ArticleDto, ArticleOptions } from "@/lib/schemas/api/articles"
import type { Paginated } from "@/lib/schemas/api/list"
import type { MediaItem } from "@/lib/schemas/api/media"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// Master 5.3 (schedule / unschedule through the API) and 5.4 (the scheduler
// tick). Task 5.4 owns instrumentation.ts: until it lands the tick leg is
// test.fixme, and Task 4 flips it to test. afterAll deletes what these
// tests create.

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

const headers = { origin: BASE_URL }

async function draftArticle(page: Page, slug: string, title: string) {
  const options = (await (
    await page.request.get("/api/v1/admin/articles/options")
  ).json()) as ArticleOptions
  const images = (await (
    await page.request.get("/api/v1/admin/media?kind=image&pageSize=1")
  ).json()) as Paginated<MediaItem>
  const created = await page.request.post("/api/v1/admin/articles", {
    headers,
    data: {
      slug,
      categoryId: options.categories[0].id,
      draft: {
        title,
        excerpt: "Goes live by itself.",
        cover: { mediaId: images.items[0].id },
        lead: null,
        tags: [],
        body: null,
      },
    },
  })
  expect(created.status()).toBe(201)
  return (await created.json()) as ArticleDto
}

const SLUGS = ["e2e-timed-update", "e2e-unscheduled-update"]

test("schedule then unschedule: a scheduled article stays off the site", async ({
  page,
  browser,
}) => {
  const { editor } = readFixtures()
  await signIn(page, editor)
  const title = "E2E Unscheduled Update"
  const slug = SLUGS[1]!
  const article = await draftArticle(page, slug, title)
  const scheduledAt = new Date(Date.now() + 86_400_000).toISOString()
  const schedule = await page.request.post(
    `/api/v1/admin/articles/${article.id}/schedule`,
    { headers, data: { version: article.version, scheduledAt } }
  )
  expect(schedule.status()).toBe(200)
  const scheduled = (await schedule.json()) as ArticleDto
  expect(scheduled.status).toBe("scheduled")

  // The editor shows the schedule; visitors still get nothing.
  await page.goto(`/admin/blog/${article.id}`)
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible()
  await expect(
    page.getByRole("main").locator('[data-slot="status-pill"]').first()
  ).toContainText("Scheduled")
  const anon = await browser.newContext()
  const visitor = await anon.newPage()
  await visitor.goto(`/blog/${slug}`)
  await expect(
    visitor.getByRole("heading", { level: 1, name: title })
  ).toHaveCount(0)
  await anon.close()

  const cancel = await page.request.post(
    `/api/v1/admin/articles/${article.id}/unschedule`,
    { headers, data: { version: scheduled.version } }
  )
  expect(cancel.status()).toBe(200)
  expect(((await cancel.json()) as ArticleDto).status).toBe("draft")
})

test.fixme("a scheduled article goes live on the next scheduler tick", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000)
  const { editor } = readFixtures()
  await signIn(page, editor)
  const title = "E2E Timed Update"
  const slug = SLUGS[0]!
  const article = await draftArticle(page, slug, title)
  const schedule = await page.request.post(
    `/api/v1/admin/articles/${article.id}/schedule`,
    {
      headers,
      data: {
        version: article.version,
        scheduledAt: new Date(Date.now() + 3_000).toISOString(),
      },
    }
  )
  expect(schedule.status()).toBe(200)
  expect(((await schedule.json()) as ArticleDto).status).toBe("scheduled")

  const context = await browser.newContext()
  const visitor = await context.newPage()
  // Not on the site yet (this also caches the article list without it)…
  await visitor.goto(`/blog/${slug}`)
  await expect(
    visitor.getByRole("heading", { level: 1, name: title })
  ).toHaveCount(0)
  // …until the scheduler publishes it and expires the cache.
  await expect(async () => {
    await visitor.goto(`/blog/${slug}`)
    await expect(
      visitor.getByRole("heading", { level: 1, name: title })
    ).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 180_000, intervals: [5_000] })
  await visitor.goto("/blog")
  await expect(
    visitor.getByRole("heading", { level: 3, name: title })
  ).toBeVisible()
  await context.close()

  const after = (await (
    await page.request.get(`/api/v1/admin/articles/${article.id}`)
  ).json()) as ArticleDto
  expect(after).toMatchObject({ status: "published", live: true })
})

test.afterAll(async ({ browser }) => {
  const { editor } = readFixtures()
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("restore scheduled") },
  })
  try {
    const page = await context.newPage()
    await signIn(page, editor)
    const list = (await (
      await page.request.get("/api/v1/admin/articles?pageSize=100")
    ).json()) as { items: { id: string; slug: string; version: number }[] }
    for (const a of list.items.filter((a) => SLUGS.includes(a.slug))) {
      const res = await page.request.delete(
        `/api/v1/admin/articles/${a.id}?version=${a.version}`,
        { headers }
      )
      expect(res.status()).toBe(200)
    }
  } finally {
    await context.close()
  }
})
