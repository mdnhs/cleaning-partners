import { expect, type Page, test } from "@playwright/test"

import { dockLinks, visibleNav } from "@/lib/admin/nav"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"
import { ROLES } from "@/lib/auth/roles"

import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD } from "./fixtures"

// R11-8 "sign-in per role": every role's account (seeded by tests/e2e/seed.ts)
// sees exactly the menu, screens and API its role grants, derived from the
// same nav + permission tables. CP's nav (Blog, Collections, Appearance,
// AI assistant, custom pages) is covered by construction.

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

async function signIn(page: Page, email: string) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

/**
 * Screens guarded by requirePage (forbidden page otherwise). The permissions
 * are spelled out, not read from the registry, so they check it.
 */
const SCREENS: { path: string; permission: PermissionRequest }[] = [
  { path: "/admin/pages", permission: { page: ["read"] } },
  { path: "/admin/blog", permission: { article: ["read"] } },
  { path: "/admin/services", permission: { service: ["read"] } },
  { path: "/admin/media", permission: { media: ["read"] } },
  { path: "/admin/seo", permission: { seo: ["read"] } },
  { path: "/admin/settings/site", permission: { settings: ["read"] } },
  {
    path: "/admin/settings/integrations/smtp",
    permission: { integration: ["read"] },
  },
  {
    path: "/admin/settings/ai-assistant",
    permission: { integration: ["read"] },
  },
  { path: "/admin/leads", permission: { lead: ["read"] } },
  { path: "/admin/users", permission: { user: ["read"] } },
  { path: "/admin/activity", permission: { audit: ["read"] } },
  { path: "/admin/marketing/events", permission: { marketing: ["read"] } },
  { path: "/admin/marketing/code", permission: { customCode: ["read"] } },
  { path: "/admin/design", permission: { customCode: ["update"] } },
  { path: "/admin/appearance", permission: { appearance: ["read"] } },
]

/** A builder page that does not exist: the permission check comes first. */
const BUILDER_PATH = "/admin/pages/custom/0199a000-0000-7000-8000-000000000000"

for (const role of ROLES) {
  test(`${role} signs in and sees exactly its menu, screens and API`, async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await signIn(page, `${role}@e2e.test`)

    const menu = visibleNav([role]).flatMap((s) => s.items.map((i) => i.label))
    // exact: "Admin" would also match the footer dock ("Administration").
    const nav = page.getByRole("navigation", { name: "Admin", exact: true })
    await expect(nav.getByRole("link")).toHaveCount(menu.length)
    for (const label of menu)
      await expect(
        nav.getByRole("link", { name: new RegExp(`^${escape(label)}`) })
      ).toBeVisible()
    const dock = page.getByRole("navigation", { name: "Administration" })
    const docked = dockLinks([role]).map((link) => link.label)
    await expect(dock.getByRole("link")).toHaveCount(docked.length)
    for (const label of docked)
      await expect(
        dock.getByRole("link", { name: label, exact: true })
      ).toBeVisible()

    const denied = page.getByRole("heading", {
      name: "You do not have access to this page",
    })
    for (const { path, permission } of SCREENS) {
      await page.goto(path)
      if (hasPermission([role], permission)) {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        await expect(denied).toHaveCount(0)
      } else await expect(denied).toBeVisible()
    }

    // The builder screen: denied without page:read; with it, the check
    // passes and the unknown id is the ordinary 404 (no 403 page).
    await page.goto(BUILDER_PATH)
    if (hasPermission([role], { page: ["read"] }))
      await expect(denied).toHaveCount(0)
    else await expect(denied).toBeVisible()

    const api = await page.request.get("/api/v1/admin/pages")
    expect(api.status()).toBe(
      hasPermission([role], { page: ["read"] }) ? 200 : 403
    )
    const builderApi = await page.request.get("/api/v1/admin/builder-pages")
    expect(builderApi.status()).toBe(
      hasPermission([role], { page: ["read"] }) ? 200 : 403
    )
    // Same-origin with an empty body: a role without page:create gets 403;
    // one with it reaches validation (never creates a row).
    const create = await page.request.post("/api/v1/admin/builder-pages", {
      headers: { origin: BASE_URL, "content-type": "application/json" },
      data: {},
    })
    if (hasPermission([role], { page: ["create"] }))
      expect(create.status()).toBe(422)
    else expect(create.status()).toBe(403)
  })
}

test("author: the API refuses publishing and editing someone else's article", async ({
  page,
}) => {
  await signIn(page, "author@e2e.test")
  const list = await page.request.get("/api/v1/admin/articles?pageSize=1")
  expect(list.status()).toBe(200)
  const [first] = (await list.json()).items as { id: string }[]
  expect(first).toBeDefined()
  const detail = await (
    await page.request.get(`/api/v1/admin/articles/${first!.id}`)
  ).json()
  // Same-origin, so a 403 here is the permission check, not CSRF.
  const headers = { origin: BASE_URL, "content-type": "application/json" }
  const publish = await page.request.post(
    `/api/v1/admin/articles/${first!.id}/publish`,
    { headers, data: { version: detail.version } }
  )
  expect(publish.status()).toBe(403)
  expect((await publish.json()).error.message).not.toBe(
    "Cross-origin request rejected"
  )
  const edit = await page.request.put(
    `/api/v1/admin/articles/${first!.id}/draft`,
    { headers, data: { version: detail.version, draft: detail.draft } }
  )
  expect(edit.status()).toBe(403)
})
