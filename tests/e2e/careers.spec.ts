import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test"

import { healthcareJob } from "../unit/helpers/job-fixture"

import { E2E_ADMIN } from "./admin-accounts"
import { BASE_URL } from "./env"
import { clientIpFor, E2E_PASSWORD, greeting } from "./fixtures"

// Careers end to end: an admin publishes a job through the API the job
// editor uses; it is listed on /careers and in the sitemap; a visitor
// applies with a PDF; the application is in the inbox with its CV; closing
// the job moves it to Previous Openings and its form shows the notice.
// The job and its applications are deleted again (visual baselines).

const SLUG = "e2e-window-cleaner"
const TITLE = "E2E Window Cleaner"
const VISITOR = { first: "Erin", last: "Applicant" }
const PDF = Buffer.from("%PDF-1.7\nErin Applicant CV\n")
const API = "/api/v1/admin"

test.describe.configure({ mode: "serial" })

async function signIn(page: Page) {
  await page.goto("/admin/sign-in")
  await page.getByLabel("Email").fill(E2E_ADMIN.email)
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: greeting(E2E_ADMIN.name) })
  ).toBeVisible()
}

/** Same-origin JSON call with the signed-in page's cookies. */
async function call<T>(
  request: APIRequestContext,
  method: "get" | "post" | "delete",
  path: string,
  data?: unknown
): Promise<T> {
  const res = await request[method](`${API}${path}`, {
    headers: { origin: BASE_URL },
    ...(data === undefined ? {} : { data }),
  })
  expect(res.ok(), `${method.toUpperCase()} ${path} → ${res.status()}`).toBe(
    true
  )
  return (await res.json()) as T
}

type Job = { id: string; version: number }

async function cleanUp(request: APIRequestContext) {
  const list = await call<{
    items: { id: string; slug: string; version: number }[]
  }>(request, "get", "/job-postings?status=all&pageSize=100")
  for (const job of list.items.filter((j) => j.slug === SLUG))
    await call(
      request,
      "delete",
      `/job-postings/${job.id}?version=${job.version}`
    )
  const apps = await call<{ items: { id: string; name: string }[] }>(
    request,
    "get",
    `/applications?status=all&q=${VISITOR.last}`
  )
  for (const app of apps.items)
    await call(request, "delete", `/applications/${app.id}`)
}

test("a job goes live, takes an application with a CV, then closes", async ({
  page,
  browser,
}, testInfo) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": clientIpFor(testInfo.title),
  })
  await signIn(page)
  await cleanUp(page.request)

  // Publish.
  let job = await call<Job>(page.request, "post", "/job-postings", {
    slug: SLUG,
    draft: { ...healthcareJob, title: TITLE, closingDate: null },
  })
  job = await call<Job>(
    page.request,
    "post",
    `/job-postings/${job.id}/publish`,
    {
      version: job.version,
    }
  )

  await page.goto("/careers")
  const open = page.locator("#open-positions")
  await expect(open.getByRole("heading", { name: TITLE })).toBeVisible()
  const sitemap = await page.request.get("/sitemap.xml")
  expect(await sitemap.text()).toContain(`/careers/${SLUG}`)

  // A visitor applies (no session).
  const visitor = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": clientIpFor(`${testInfo.title} visitor`),
    },
  })
  const v = await visitor.newPage()
  await v.goto(`/careers/${SLUG}/apply`)
  await v.getByLabel(/^First Name/).fill(VISITOR.first)
  await v.getByLabel(/^Surname/).fill(VISITOR.last)
  await v.getByLabel(/^Email Address/).fill("erin@e2e.cleaningpartners.test")
  await v.getByLabel(/^Mobile Number/).fill("085 000 0000")
  await v.getByLabel(/^Town \/ County/).fill("Tullamore")
  await v.getByRole("radio", { name: "Irish or UK citizen" }).check()
  for (const group of [
    /Garda vetting/,
    /lived outside Ireland/,
    /driving licence/,
  ])
    await v
      .getByRole("radiogroup", { name: group })
      .getByRole("radio", { name: "Yes" })
      .check()
  await v.getByLabel(/^Earliest Start Date/).fill("2026-12-01")
  await v.getByLabel(/^Hours per Week/).selectOption("20–30 hours")
  await v.getByRole("checkbox", { name: "Weekends" }).check()
  await v.getByLabel(/^Cleaning Experience/).selectOption("1–2 years")
  await v.getByLabel(/^Upload Your CV/).setInputFiles({
    name: "Erin Applicant CV.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  })
  await v
    .getByRole("checkbox", { name: /information in this application/ })
    .check()
  await v.getByRole("checkbox", { name: /processing my personal data/ }).check()
  await v.getByRole("button", { name: "Submit Application" }).click()
  await expect(v.getByText("Thank you — your application is in")).toBeVisible()
  await visitor.close()

  // The inbox has it, with the CV.
  await page.goto("/admin/careers/applications")
  const link = page.getByRole("link", {
    name: `${VISITOR.first} ${VISITOR.last}`,
  })
  await expect(link.first()).toBeVisible()
  await link.first().click()
  await expect(
    page.getByRole("heading", { name: `${VISITOR.first} ${VISITOR.last}` })
  ).toBeVisible()
  const cvHref = await page
    .getByRole("link", { name: /Download CV/ })
    .getAttribute("href")
  const cv = await page.request.get(cvHref!)
  expect(cv.status()).toBe(200)
  expect(cv.headers()["content-type"]).toBe("application/pdf")
  expect(cv.headers()["cache-control"]).toBe("no-store")
  expect(Buffer.from(await cv.body())).toEqual(PDF)

  // Close: Previous Openings, and the form gives way to the notice.
  await call(page.request, "post", `/job-postings/${job.id}/close`, {
    version: job.version,
  })
  await page.goto("/careers")
  await expect(
    page.locator("#open-positions").getByRole("heading", { name: TITLE })
  ).toHaveCount(0)
  await expect(page.getByText(TITLE).first()).toBeVisible()
  await page.goto(`/careers/${SLUG}/apply`)
  await expect(
    page.getByText(/This role has closed and is no longer taking applications/)
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Submit Application" })
  ).toHaveCount(0)

  await cleanUp(page.request)
})
