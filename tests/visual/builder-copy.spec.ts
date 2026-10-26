import { expect, type Page, test } from "@playwright/test"

import { blocksFromTemplate } from "@/templates/builder/from-template"
import type { PageData, PageKey } from "@/templates/registry"

import { BASE_URL } from "../e2e/env"
import { clientIpFor } from "../e2e/fixtures"

import { VISUAL_ADMIN } from "./admin-user"
import { freezeMotion } from "./freeze-motion"

test.skip(process.platform !== "darwin", "visual baselines are macOS-only")

// A page copied from a fixed page (blocksFromTemplate) must render the same
// <main> as the fixed page. Both are shot in one visitor context and the two
// PNG buffers must be byte-equal. Nothing is stored: no baseline is written.

const headers = { origin: BASE_URL }
const API = "/api/v1/admin/builder-pages"

const COPIES: [PageKey, string][] = [
  ["home", "/"],
  ["about", "/about"],
  ["services", "/services"],
  ["contact", "/contact"],
  ["privacy", "/privacy"],
]

type Dto = { id: string; version: number }

async function signInAdmin(page: Page) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(VISUAL_ADMIN.email)
  await page.getByLabel("Password", { exact: true }).fill(VISUAL_ADMIN.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.endsWith("/sign-in"))
}

async function shootMain(page: Page, path: string): Promise<Buffer> {
  const response = await page.goto(path, { waitUntil: "networkidle" })
  expect(response?.status(), path).toBe(200)
  // An error boundary or an empty page would be byte-equal on both sides.
  await expect(
    page.getByRole("heading", { name: "Something went wrong" }),
    path
  ).toHaveCount(0)
  await expect(page.locator("main h1").first(), path).toBeVisible()
  expect(
    ((await page.locator("main").innerText()) ?? "").trim().length,
    path
  ).toBeGreaterThan(0)
  await freezeMotion(page)
  return page.locator("main").screenshot({
    animations: "disabled",
    caret: "hide",
    scale: "css",
  })
}

for (const [key, fixedPath] of COPIES) {
  test(`a copy of ${key} renders the same main as the fixed page`, async ({
    browser,
    page,
  }, testInfo) => {
    const slug = `copy-check-${key}-${testInfo.project.name}`
    const admin = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": clientIpFor(slug) },
    })
    let created: Dto | null = null
    try {
      const api = await admin.newPage()
      await signInAdmin(api)

      const fixed = await api.request.get(`/api/v1/admin/pages/${key}`)
      expect(fixed.status()).toBe(200)
      const { published } = (await fixed.json()) as {
        published: PageData<PageKey>
      }

      const blocks = blocksFromTemplate(key, published)
      expect(blocks.length).toBeGreaterThan(0)
      const res = await api.request.post(API, {
        headers,
        data: {
          slug,
          title: `${key} copy check`,
          seed: { blocks },
        },
      })
      expect(res.status()).toBe(201)
      created = (await res.json()) as Dto
      const pub = await api.request.post(`${API}/${created.id}/publish`, {
        headers,
        data: { version: created.version },
      })
      expect(pub.status()).toBe(200)
      created = (await pub.json()) as Dto

      const fixedMain = await shootMain(page, fixedPath)
      const copyMain = await shootMain(page, `/p/${slug}`)
      const same = copyMain.equals(fixedMain)
      if (!same) {
        await testInfo.attach("fixed-main", {
          body: fixedMain,
          contentType: "image/png",
        })
        await testInfo.attach("copy-main", {
          body: copyMain,
          contentType: "image/png",
        })
      }
      expect(same).toBe(true)
    } finally {
      try {
        if (created) {
          const api = admin.pages()[0] ?? (await admin.newPage())
          const current = await api.request.get(`${API}/${created.id}`)
          const version = current.ok()
            ? ((await current.json()) as Dto).version
            : created.version
          const del = await api.request.delete(
            `${API}/${created.id}?version=${version}`,
            { headers }
          )
          expect(del.ok()).toBe(true)
        }
      } finally {
        await admin.close()
      }
    }
  })
}
