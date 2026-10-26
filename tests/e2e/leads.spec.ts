import { type Browser, expect, type Page, test } from "@playwright/test"

import { E2E_OWNER } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting, readFixtures } from "./fixtures"
import { deleteLeadsFrom, E2E_LEAD_DOMAIN } from "./lead-cleanup"

// Master 7.3/7.4: the public form creates a lead the intake user works in
// the inbox, with the staff-notification outcome on its activity; honeypot →
// no lead; the 6th post from one IP in 10 minutes → 429.
//
// Email delivery: the E2E server is the standalone server.js (production),
// whose SMTP guard (Phase 6) refuses loopback, so on most machines the staff
// email is not sent and the lead's activity records that outcome. Where
// Mailpit is reachable and the mail was sent, the message to
// info@cleaningpartners.ie is checked in Mailpit. Delivery on loopback is
// covered by tests/integration/api/leads-public.test.ts.

const SUCCESS = /we've received your request and will be in touch shortly/
/** This spec's visitor address: its leads are deleted again (sidebar badge). */
const VISITOR = "leads-spec@e2e.cleaningpartners.test"
const ADDRESS = "12 Maple Court, Dublin D02 X285"
const STAFF_INBOX = "info@cleaningpartners.ie"
const MAILPIT = "http://127.0.0.1:8026"

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
})

test.afterAll(async ({ playwright }) => {
  // The visual suite (same server) expects the new-leads badge hidden.
  const request = await playwright.request.newContext({ baseURL: BASE_URL })
  await deleteLeadsFrom(request, E2E_LEAD_DOMAIN)
  await request.dispose()
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

async function sendEnquiry(
  page: Page,
  name: string,
  opts: { honeypot?: string; expect?: "sent" | "rate-limited" } = {}
) {
  await page.goto("/contact#quote")
  const form = page
    .locator("form")
    .filter({ has: page.getByLabel("Full Name") })
  await form.getByLabel("Full Name").fill(name)
  await form.getByLabel("Email Address").fill(VISITOR)
  await form.getByLabel("Phone Number").fill("085 123 4567")
  await form
    .getByLabel("Service Required")
    .selectOption({ label: "Domestic Cleaning" })
  await form.getByLabel("Address / Eircode").fill(ADDRESS)
  await form
    .getByLabel("Tell us about your space")
    .fill("Please quote for a deep clean.")
  await form.getByLabel("I agree to be contacted").check()
  if (opts.honeypot)
    await form.locator('input[name="website"]').fill(opts.honeypot, { force: true })
  await form.getByRole("button", { name: "Send Request" }).click()
  if (opts.expect === "rate-limited")
    await expect(
      form.getByText("Too many attempts. Please try again in a few minutes.")
    ).toBeVisible()
  else await expect(form.getByText(SUCCESS)).toBeVisible()
}

/**
 * The board is the inbox's default view (D3.3) and has no search: switch
 * to the table, where the search box lives.
 */
async function showTable(page: Page) {
  await page.getByRole("button", { name: "Table", exact: true }).click()
  await expect(
    page.getByRole("searchbox", { name: "Search leads" })
  ).toBeVisible()
}

test("public enquiry → lead in the intake inbox, worked by the intake user", async ({
  page,
  browser,
}) => {
  const { intake } = readFixtures()
  const name = `Visitor ${Date.now()}`

  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor(`${name} visitor`) },
  })
  await sendEnquiry(await visitor.newPage(), name)
  await visitor.close()

  await signIn(page, intake)
  // Intake sees only leads (plus Dashboard/Account) and the API agrees.
  const nav = page.getByRole("navigation", { name: "Admin" })
  await expect(nav.getByRole("link", { name: /^Enquiries/ })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Pages" })).toHaveCount(0)
  expect((await page.request.get("/api/v1/admin/pages")).status()).toBe(403)

  // The sidebar badge counts the new, unassigned enquiry.
  await expect(
    nav.getByRole("img", { name: /new enquiries$/ }).first()
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: /^Enquiries, \d+ new unassigned/ })
  ).toBeVisible()

  await nav.getByRole("link", { name: /^Enquiries/ }).click()
  await showTable(page)
  await page.getByRole("searchbox", { name: "Search leads" }).fill(name)
  await page.getByRole("link", { name }).first().click()
  // D3.2: the enquiry opens in a side drawer over the inbox.
  const drawer = page.getByRole("dialog", { name })
  await expect(drawer.getByRole("heading", { name })).toBeVisible()
  // The service and address the visitor typed.
  await expect(drawer.getByText("Domestic Cleaning")).toBeVisible()
  await expect(drawer.getByText(ADDRESS)).toBeVisible()

  // shadcn Select (MK parity A5): open the combobox, pick the option.
  await drawer.getByRole("combobox", { name: "Lead status" }).click()
  await page.getByRole("option", { name: "Contacted" }).click()
  // No success toast (final review M8): the select and badge show it.
  await expect(
    drawer.getByRole("combobox", { name: "Lead status" })
  ).toHaveText("Contacted")
  await drawer.getByLabel("Add a note").fill("Called, sending a quote")
  await drawer.getByRole("button", { name: "Add note" }).click()
  await expect(
    drawer
      .getByRole("region", { name: "Notes" })
      .getByText("Called, sending a quote")
  ).toBeVisible()
  const activity = drawer.getByRole("region", { name: "Activity" })
  await expect(activity.getByText("Sent from /contact")).toBeVisible()
  // The stored sourcePage reaches the drawer fact through the DTO, too.
  await expect(drawer.locator("code", { hasText: /^\/contact$/ })).toBeVisible()
  // Recipients come from settings.leads (seeded info@cleaningpartners.ie);
  // the mailer ran and recorded its outcome.
  const sent = activity.getByText(/^Staff notification sent to 1 recipient/)
  const notSent = activity.getByText(
    "Staff notification not sent: email is not configured or failed."
  )
  await expect(sent.or(notSent)).toBeVisible()
  if (await sent.isVisible()) {
    // Mailpit's API, if this machine runs it: the staff mail reached the inbox.
    const found = await expect
      .poll(
        async () => {
          try {
            const res = await fetch(
              `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${STAFF_INBOX} ${name}`)}`
            )
            return ((await res.json()) as { total: number }).total
          } catch {
            return 0
          }
        },
        { timeout: 10_000 }
      )
      .toBeGreaterThan(0)
      .then(() => true)
      .catch(() => false)
    expect(found).toBe(true)
  }
  // The lead's DB row is the same record the drawer shows.
  const row = await page.request.get(
    `/api/v1/admin/leads?status=all&q=${encodeURIComponent(name)}`
  )
  expect(((await row.json()) as { total: number }).total).toBe(1)
  await expect(activity.getByText("New → Contacted")).toBeVisible()
})

test("an assignee can be set from the drawer", async ({ page, browser }) => {
  const { intake } = readFixtures()
  const name = `Assigned ${Date.now()}`
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor(`${name} visitor`) },
  })
  await sendEnquiry(await visitor.newPage(), name)
  await visitor.close()

  await signIn(page, intake)
  await page.goto("/admin/leads")
  await showTable(page)
  await page.getByRole("searchbox", { name: "Search leads" }).fill(name)
  await page.getByRole("link", { name }).first().click()
  const drawer = page.getByRole("dialog", { name })
  await drawer.getByRole("combobox", { name: "Assigned to" }).click()
  await page.getByRole("option", { name: new RegExp(intake.name) }).click()
  await expect(
    drawer.getByRole("combobox", { name: "Assigned to" })
  ).toContainText(intake.name)
  await expect(
    drawer
      .getByRole("region", { name: "Activity" })
      .getByText(/Assigned to/)
  ).toBeVisible()
})

test("honeypot filled → success shown, but no lead is stored", async ({
  page,
  browser,
}) => {
  const { intake } = readFixtures()
  const name = `Bot ${Date.now()}`
  const bot = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor(`${name} bot`) },
  })
  await sendEnquiry(await bot.newPage(), name, {
    honeypot: "http://spam.example",
  })
  await bot.close()

  await signIn(page, intake)
  const res = await page.request.get(
    `/api/v1/admin/leads?status=all&q=${encodeURIComponent(name)}`
  )
  expect(res.status()).toBe(200)
  expect(((await res.json()) as { total: number }).total).toBe(0)
})

test("the form shows the rate-limit message after repeated posts", async ({
  playwright,
  browser,
}) => {
  const ip = clientIpFor(`rate-limit-form ${Date.now()}`)
  const api = await playwright.request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "x-forwarded-for": ip },
  })
  const data = {
    name: "Rate",
    email: VISITOR,
    phone: "085 123 4567",
    message: "Hi",
    consent: true,
    website: "bot",
  }
  for (let i = 0; i < 5; i++)
    expect((await api.post("/api/v1/public/leads", { data })).status()).toBe(
      200
    )
  await api.dispose()
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": ip },
  })
  await sendEnquiry(await visitor.newPage(), `Limited ${Date.now()}`, {
    expect: "rate-limited",
  })
  await visitor.close()
})

test("6th enquiry from one IP within 10 minutes → 429 with Retry-After", async ({
  playwright,
}) => {
  const api = await playwright.request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      "x-forwarded-for": clientIpFor(`rate-limit-6th ${Date.now()}`),
    },
  })
  // Honeypot bodies: counted by the limiter, but no lead or email is created.
  const data = {
    name: "Rate",
    email: VISITOR,
    phone: "085 123 4567",
    message: "Hi",
    consent: true,
    website: "bot",
  }
  for (let i = 0; i < 5; i++)
    expect((await api.post("/api/v1/public/leads", { data })).status()).toBe(
      200
    )
  const sixth = await api.post("/api/v1/public/leads", { data })
  expect(sixth.status()).toBe(429)
  expect(Number(sixth.headers()["retry-after"])).toBeGreaterThan(0)
  expect(((await sixth.json()) as { error: { code: string } }).error.code).toBe(
    "RATE_LIMITED"
  )
  await api.dispose()
})

/**
 * Publishes settings.tracking as the owner (attribution needs the consent
 * banner, which shows only while tracking is on). Returns the previous
 * draft so the caller can put it back.
 */
async function publishTracking(
  browser: Browser,
  change: (draft: Record<string, unknown>) => Record<string, unknown>
): Promise<Record<string, unknown>> {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor("leads tracking") },
  })
  const page = await context.newPage()
  try {
    await signIn(page, E2E_OWNER)
    const same = { origin: BASE_URL }
    const dto = (await (
      await page.request.get("/api/v1/admin/marketing/tracking")
    ).json()) as { draft: Record<string, unknown>; version: number }
    const saved = await page.request.put(
      "/api/v1/admin/marketing/tracking/draft",
      {
        headers: same,
        data: { draft: change(dto.draft), version: dto.version },
      }
    )
    expect(saved.status()).toBe(200)
    const { version } = (await saved.json()) as { version: number }
    const published = await page.request.post(
      "/api/v1/admin/marketing/tracking/publish",
      { headers: same, data: { version } }
    )
    expect(published.status()).toBe(200)
    return dto.draft
  } finally {
    await context.close()
  }
}

test("first-touch attribution travels with the enquiry, only with analytics consent", async ({
  page,
  browser,
}) => {
  const { intake } = readFixtures()
  const name = `Attributed ${Date.now()}`
  const refused = `Unattributed ${Date.now()}`
  // Banner on, no channel IDs: consent without loading third-party scripts.
  const before = await publishTracking(browser, (d) => ({
    ...d,
    enabled: true,
    gtmEnabled: false,
    ga4Enabled: false,
    metaEnabled: false,
  }))
  try {
    const landing = "/?utm_source=e2e&utm_medium=cpc&utm_campaign=cp-test"

    // Accepts analytics on the landing page, then moves on to /contact:
    // the first touch is kept for the visit.
    const visitor = await browser.newContext({
      extraHTTPHeaders: { "x-forwarded-for": clientIpFor(`${name} visitor`) },
    })
    const tab = await visitor.newPage()
    await tab.goto(landing)
    await tab
      .locator("[data-consent-banner]")
      .getByRole("button", { name: "Accept all" })
      .click()
    await sendEnquiry(tab, name)
    await visitor.close()

    // Refuses: nothing is stored or sent.
    const other = await browser.newContext({
      extraHTTPHeaders: {
        "x-forwarded-for": clientIpFor(`${refused} visitor`),
      },
    })
    const tab2 = await other.newPage()
    await tab2.goto(landing)
    await tab2
      .locator("[data-consent-banner]")
      .getByRole("button", { name: "Reject non-essential" })
      .click()
    expect(
      await tab2.evaluate(() => sessionStorage.getItem("cp_attribution"))
    ).toBeNull()
    await sendEnquiry(tab2, refused)
    await other.close()
  } finally {
    await publishTracking(browser, () => before)
  }

  await signIn(page, intake)
  await page.goto("/admin/leads")
  await showTable(page)
  await page.getByRole("searchbox", { name: "Search leads" }).fill(name)
  // Exact: the search (and a substring name match) also finds "Unattributed …".
  await page.getByRole("link", { name, exact: true }).first().click()
  const source = page
    .getByRole("dialog", { name, exact: true })
    .getByRole("region", { name: "Source" })
  await expect(source.getByText("e2e", { exact: true })).toBeVisible()
  await expect(source.getByText("cpc", { exact: true })).toBeVisible()
  await expect(source.getByText("cp-test", { exact: true })).toBeVisible()

  await page.goto("/admin/leads")
  await showTable(page)
  await page.getByRole("searchbox", { name: "Search leads" }).fill(refused)
  await page.getByRole("link", { name: refused }).first().click()
  await expect(
    page
      .getByRole("dialog", { name: refused })
      .getByRole("region", { name: "Source" })
  ).toContainText("No source was recorded for this enquiry.")
})

test("the detail URL lands on the drawer, and Back closes it (D3.2)", async ({
  page,
  browser,
}) => {
  const { intake } = readFixtures()
  const name = `Drawer ${Date.now()}`
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": clientIpFor(`${name} visitor`) },
  })
  await sendEnquiry(await visitor.newPage(), name)
  await visitor.close()

  await signIn(page, intake)
  const res = await page.request.get(
    `/api/v1/admin/leads?q=${encodeURIComponent(name)}`
  )
  const { items } = (await res.json()) as { items: { id: string }[] }
  const id = items[0]!.id

  // Old links (notification email, search) redirect to the inbox drawer.
  await page.goto(`/admin/leads/${id}`)
  await expect(page).toHaveURL(`/admin/leads?lead=${id}`)
  await expect(
    page.getByRole("dialog", { name }).getByRole("heading", { name })
  ).toBeVisible()
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: "Close" })
    .click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page).toHaveURL("/admin/leads")

  // Opening pushes a history entry: the browser's Back closes the drawer
  // and stays on the inbox.
  await showTable(page)
  await page.getByRole("searchbox", { name: "Search leads" }).fill(name)
  await page.getByRole("link", { name }).first().click()
  await expect(page.getByRole("dialog", { name })).toBeVisible()
  expect(new URL(page.url()).searchParams.get("lead")).toBe(id)
  await page.goBack()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get("lead")).toBeNull()
  await expect(
    page.getByRole("heading", { level: 1, name: "Enquiries" })
  ).toBeVisible()
})
