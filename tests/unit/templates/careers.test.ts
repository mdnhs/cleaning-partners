import { describe, expect, it } from "vitest"

import { isOpenJob } from "@/lib/careers/open"
import { careersSettings } from "@/lib/schemas/settings/careers"
import { jobContent } from "@/lib/schemas/content/job"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { jobsFixture } from "@/server/db/seed/fixtures/jobs"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"
import { careersTemplate } from "@/templates/careers/schema"
import { PAGE_KEYS, PAGE_PATHS, PAGES } from "@/templates/registry"

const pages = pagesFixture(fixtureMediaLookup)
const settings = settingsFixture(fixtureMediaLookup)

describe("careers page copy", () => {
  it("is a fixed page at /careers with the careers template", () => {
    expect(PAGE_KEYS).toContain("careers")
    expect(PAGES.careers).toBe("careers")
    expect(PAGE_PATHS.careers).toBe("/careers")
  })

  it("the seed copy parses and round-trips unchanged", () => {
    expect(careersTemplate.parse(pages.careers.data)).toEqual(
      pages.careers.data
    )
  })

  it("carries the Figma headings and the form's option lists", () => {
    const c = pages.careers.data
    expect(c.hero.title).toBe("Careers")
    expect(c.why.title).toBe("Why Work With The Clean Team")
    expect(c.why.cards.map((card) => card.title)).toEqual([
      "Paid Training",
      "Weekly Pay",
      "Uniform & Equipment",
      "Room to Grow",
    ])
    expect(c.open.title).toBe("Open Positions")
    expect(c.previous.title).toBe("Previous Openings")
    expect(c.process.steps.map((s) => s.title)).toEqual([
      "Apply Online",
      "Quick Phone Chat",
      "Interview & Vetting",
      "Paid Induction",
    ])
    expect(c.talentPool.title).toBe("Don’t see the right role?")
    expect(c.apply.options.shifts).toEqual([
      "Early mornings (6am–11am)",
      "Daytime (9am–5pm)",
      "Evenings (5pm–10pm)",
      "Weekends",
      "Bank holidays",
      "Flexible / cover shifts",
    ])
    expect(c.apply.options.certificates).toContain("HSELanD Hand Hygiene")
    expect(c.apply.options.rightToWork[0]).toBe("Irish or UK citizen")
    expect(c.apply.fields.firstName.label).toBe("First Name")
  })
})

describe("seeded jobs", () => {
  const jobs = jobsFixture()
  const now = new Date("2026-11-04T12:00:00Z")

  it("seeds the eight Figma jobs, five of them open", () => {
    expect(jobs).toHaveLength(8)
    for (const job of jobs)
      expect(jobContent.parse(job.content)).toEqual(job.content)
    const open = jobs.filter((job) =>
      isOpenJob(
        {
          published: job.content,
          closedAt: job.closedAt,
          closingDate: job.content.closingDate,
        },
        now
      )
    )
    expect(open.map((j) => j.content.title)).toEqual([
      "Cleaning Operative – Healthcare",
      "Commercial Cleaner – Evenings",
      "Cleaning Supervisor",
      "Domestic Cleaner",
      "Deep Clean & Window Technician",
    ])
  })
})

describe("navigation and careers settings", () => {
  it("the header links include Careers before Contact", () => {
    const hrefs = settings.navigation.links.map((l) => l.href)
    expect(hrefs.indexOf("/careers")).toBe(hrefs.indexOf("/contact") - 1)
  })

  it("careers settings keep applications 12 months by default", () => {
    expect(careersSettings.parse({ recipients: [] }).retentionMonths).toBe(12)
    expect(
      careersSettings.safeParse({ recipients: [], retentionMonths: 40 }).success
    ).toBe(false)
    expect(settings.careers.retentionMonths).toBe(12)
  })
})
