import { expect, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// The dock's Help opens /admin/help for every signed-in user: how-to
// guides by area (only the ones the role can open) and the active owners
// to mail.

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

test("help page: guides by area, the shortcuts article and an owner's mailto", async ({
  page,
}) => {
  const { editor } = readFixtures()
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(editor.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(editor.name) })
  ).toBeVisible()

  const dock = page.getByRole("navigation", { name: "Administration" })
  await expect(dock.getByRole("link", { name: "Account" })).toHaveCount(0)
  await dock.getByRole("link", { name: "Help", exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/help$/)
  await expect(
    page.getByRole("heading", { name: "Help", level: 1 })
  ).toBeVisible()

  // Docs layout: topics on the left, one article at a time.
  const topics = page.getByRole("navigation", { name: "Help topics" })
  await expect(topics).toBeVisible()
  await expect(
    page.getByRole("link", { name: /Read the guide/ })
  ).toHaveAttribute("href", "/admin/help/getting-started")

  await topics.getByRole("link", { name: "Saving and publishing" }).click()
  await expect(page).toHaveURL(/\/admin\/help\/saving-and-publishing$/)
  await expect(
    page.getByRole("heading", { name: "Saving and publishing", level: 1 })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Drafts save by themselves", level: 2 })
  ).toBeVisible()

  // The keyboard shortcuts are in Getting started.
  await topics.getByRole("link", { name: "Getting started" }).click()
  await expect(
    page.getByRole("heading", { name: "Keyboard shortcuts", level: 2 })
  ).toBeVisible()

  // An editor does not open Enquiries, so that article is not listed.
  await expect(topics.getByRole("link", { name: "Enquiries" })).toHaveCount(0)

  // The owners to ask are on the Help home.
  await page.goto("/admin/help")
  await expect(
    page.getByRole("link", { name: new RegExp(E2E_OWNER.email) })
  ).toHaveAttribute("href", `mailto:${E2E_OWNER.email}`)
})
