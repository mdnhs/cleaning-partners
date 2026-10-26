import { expect, type Page, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import {
  askAssistant,
  assistantOnHomeEditor,
  openAssistant,
  SAVED_SMTP,
} from "./ai-pins"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, readFixtures } from "./fixtures"

// MK parity C7: the assistant is discoverable before it is set up. The e2e
// database has no `integrations.ai` row (seed.ts), so it is unconfigured:
// managers see the sparkle button and a way to set it up; others see none.

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
  await expect(page).toHaveURL(/\/admin$/)
}

test("the owner sees the sparkle button and reaches the AI settings from it", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  const button = page.getByRole("button", { name: "AI assistant" })
  await expect(button).toBeVisible()
  await button.click()
  const panel = page.getByRole("dialog", { name: "AI assistant" })
  await expect(
    panel.getByText("The AI assistant is turned off or not set up yet.")
  ).toBeVisible()
  await panel.getByRole("link", { name: "Set up AI assistant" }).click()
  await expect(page).toHaveURL(/\/admin\/settings\/ai-assistant$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "AI assistant" })
  ).toBeVisible()
  await expect(
    page.getByRole("switch", { name: "Turn on the AI assistant" })
  ).toBeVisible()
})

test("an editor sees no sparkle button", async ({ page }) => {
  await signIn(page, readFixtures().editor.email)
  // The topbar has rendered (the bell is always there) before the check.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: "AI assistant" })).toHaveCount(
    0
  )
})

// Leaves no home draft row behind, even when the Insert test fails.
test.afterAll(async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("restore ai home") },
  })
  try {
    const page = await context.newPage()
    await signIn(page, E2E_OWNER.email)
    type Dto = { version: number; published: Record<string, unknown> }
    const current = (await (
      await page.request.get("/api/v1/admin/pages/home")
    ).json()) as Dto
    const saved = await page.request.put("/api/v1/admin/pages/home/draft", {
      headers: { origin: BASE_URL },
      data: { version: current.version, draft: current.published },
    })
    expect(saved.status()).toBe(200)
  } finally {
    await context.close()
  }
})

test("Insert writes the pinned reply into the focused hero field and the draft autosaves", async ({
  page,
}) => {
  await signIn(page, E2E_OWNER.email)
  const { field } = await assistantOnHomeEditor(page, SAVED_SMTP)
  const panel = await openAssistant(page)
  await askAssistant(page, panel)
  const saved = page.waitForRequest(
    (r) =>
      r.method() === "PUT" &&
      r.url().endsWith("/api/v1/admin/pages/home/draft"),
    { timeout: 10_000 }
  )
  await panel.getByRole("button", { name: /^Insert into / }).click()
  await expect(field).toHaveValue(/spotless/i)
  const body = (await saved).postData() ?? ""
  expect(body).toMatch(/spotless/i)
})
