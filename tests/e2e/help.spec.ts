import { expect, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"

// The dock's Help opens /admin/help for every signed-in user: how-to
// answers, the shortcuts and the active owners to mail.

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

test("help page: the dock's Help shows shortcuts and an owner's mailto", async ({
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

  // Docs layout: an outline on the left, one article at a time.
  await expect(
    page.getByRole("heading", { name: "How can we help?" })
  ).toBeVisible()
  const outline = page.getByRole("navigation", { name: "Help outline" })

  await outline
    .getByRole("link", { name: "Add a customer testimonial", exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/help#testimonials$/)
  await expect(
    page.getByRole("heading", { name: "Add a customer testimonial", level: 2 })
  ).toBeVisible()
  await expect(
    page.getByText("drag rows to change the order", { exact: false })
  ).toBeVisible()

  await outline.getByRole("link", { name: "Keyboard shortcuts" }).click()
  await expect(page.getByText("Search and go")).toBeVisible()
  await expect(page.getByText("Close panels")).toBeVisible()

  await outline.getByRole("link", { name: "Who to contact" }).click()
  await expect(
    page.getByRole("link", { name: new RegExp(E2E_OWNER.email) })
  ).toHaveAttribute("href", `mailto:${E2E_OWNER.email}`)
})
