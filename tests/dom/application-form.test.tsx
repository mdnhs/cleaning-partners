import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

import { ApplicationForm } from "@/components/careers/application-form"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import type { PublicJob } from "@/server/modules/job-postings/queries"
import { applyView } from "@/templates/careers/view"

import { healthcareJob } from "../unit/helpers/job-fixture"

const job: PublicJob = {
  id: "00000000-0000-7000-8000-000000000001",
  slug: "cleaning-operative-healthcare",
  sortOrder: 0,
  seo: {},
  content: { ...healthcareJob, closingDate: null },
  publishedAt: new Date("2026-11-01T09:00:00Z"),
  closedAt: null,
  published: true,
}
const view = applyView(
  fixtureSiteSources(),
  job,
  new Date("2026-11-04T12:00:00Z")
)

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
let response: () => Response
const defaultFetch = async (
  input: RequestInfo | URL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- typed for mock.calls
  _init?: RequestInit
) => {
  if (String(input).endsWith("/config"))
    return json(200, { turnstileSiteKey: null })
  return response()
}
const fetchMock = vi.fn(defaultFetch)
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

beforeEach(() => {
  response = () => json(200, { ok: true })
  fetchMock.mockReset()
  fetchMock.mockImplementation(defaultFetch)
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const f = view.form.fields
async function fillRequired() {
  const user = userEvent.setup()
  await user.type(
    screen.getByLabelText(new RegExp(`^${f.firstName.label}`)),
    "Mary"
  )
  await user.type(
    screen.getByLabelText(new RegExp(`^${f.surname.label}`)),
    "Kelly"
  )
  await user.type(
    screen.getByLabelText(new RegExp(`^${f.email.label}`)),
    "mary@example.com"
  )
  await user.type(
    screen.getByLabelText(new RegExp(`^${f.phone.label}`)),
    "085 000 0000"
  )
  await user.type(
    screen.getByLabelText(new RegExp(`^${f.town.label}`)),
    "Portlaoise"
  )
  await user.click(
    screen.getByRole("radio", { name: view.form.options.rightToWork[0]! })
  )
  fireEvent.change(screen.getByLabelText(new RegExp(`^${f.startDate.label}`)), {
    target: { value: "2026-12-01" },
  })
  await user.selectOptions(
    screen.getByLabelText(new RegExp(`^${f.hoursPerWeek.label}`)),
    view.form.options.hours[1]!
  )
  await user.click(
    screen.getByRole("checkbox", { name: view.form.options.shifts[0]! })
  )
  await user.selectOptions(
    screen.getByLabelText(new RegExp(`^${f.experience.label}`)),
    view.form.options.years[0]!
  )
  for (const group of [
    f.gardaVetting.label,
    f.livedAbroad.label,
    f.transport.label,
  ])
    await user.click(
      screen
        .getByRole("radiogroup", { name: new RegExp(group.slice(0, 20)) })
        .querySelector("input[value=yes]")!
    )
  await user.click(
    screen.getByRole("checkbox", { name: view.form.declaration })
  )
  await user.click(screen.getByRole("checkbox", { name: view.form.privacy }))
}

describe("ApplicationForm", () => {
  it("names the job and the six sections", () => {
    render(<ApplicationForm view={view} />)
    for (const s of Object.values(view.form.sections))
      expect(
        screen.getByRole("heading", { name: new RegExp(s.title) })
      ).toBeInTheDocument()
  })

  it("shows the required message on every empty required field and sends nothing", async () => {
    render(<ApplicationForm view={view} />)
    await userEvent.click(
      screen.getByRole("button", { name: view.form.submit })
    )
    expect(
      screen.getAllByText(view.form.errors.required).length
    ).toBeGreaterThan(5)
    expect(
      fetchMock.mock.calls.filter(([u]) => !String(u).endsWith("/config"))
    ).toHaveLength(0)
  })

  it("the CV drop zone refuses a picture and a 6 MB PDF", async () => {
    render(<ApplicationForm view={view} />)
    const input = screen.getByLabelText(
      new RegExp(escape(f.cv.label))
    ) as HTMLInputElement
    await userEvent.upload(
      input,
      new File(["x"], "me.png", { type: "image/png" }),
      { applyAccept: false }
    )
    expect(screen.getByText(view.form.errors.cvType)).toBeInTheDocument()
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "cv.pdf", {
      type: "application/pdf",
    })
    await userEvent.upload(input, big)
    expect(screen.getByText(view.form.errors.cvSize)).toBeInTheDocument()
  })

  it("posts the form, shows Sending… meanwhile, then the success message", async () => {
    let release!: () => void
    response = () => json(200, { ok: true })
    fetchMock.mockImplementationOnce(async () =>
      json(200, { turnstileSiteKey: null })
    )
    render(<ApplicationForm view={view} />)
    await fillRequired()
    const gate = new Promise<void>((r) => (release = r))
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/config"))
        return json(200, { turnstileSiteKey: null })
      await gate
      return json(200, { ok: true })
    })
    await userEvent.click(
      screen.getByRole("button", { name: view.form.submit })
    )
    expect(
      await screen.findByRole("button", { name: view.form.sending })
    ).toBeDisabled()
    release()
    expect(await screen.findByText(view.form.success.title)).toBeInTheDocument()
    const [, init] = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith("/applications")
    )!
    const body = init!.body as FormData
    expect(body.get("jobId")).toBe(job.id)
    expect(body.getAll("shifts")).toEqual([view.form.options.shifts[0]])
  })

  it("a 409 swaps the form for the closed notice", async () => {
    response = () =>
      json(409, { error: { code: "CONFLICT", message: "closed" } })
    render(<ApplicationForm view={view} />)
    await fillRequired()
    await userEvent.click(
      screen.getByRole("button", { name: view.form.submit })
    )
    await waitFor(() =>
      expect(screen.getByText(view.form.errors.closed)).toBeInTheDocument()
    )
    expect(screen.queryByRole("button", { name: view.form.submit })).toBeNull()
  })
})
