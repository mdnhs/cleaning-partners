import { describe, expect, it } from "vitest"

import { jobsFixture } from "@/server/db/seed/fixtures/jobs"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import type { PublicJob } from "@/server/modules/job-postings/queries"
import { careersView, closedOnDate, postedAgo } from "@/templates/careers/view"

const DAY = 24 * 60 * 60_000
const now = new Date("2026-11-04T12:00:00Z")

const jobs: PublicJob[] = jobsFixture().map((job, sortOrder) => ({
  id: `job-${sortOrder}`,
  slug: job.slug,
  sortOrder,
  seo: {},
  content: job.content,
  publishedAt: new Date(
    now.getTime() - [3, 5, 7, 10, 14, 70, 90, 110][sortOrder]! * DAY
  ),
  closedAt: job.closedAt,
  published: true,
}))

describe("careersView", () => {
  const view = careersView(fixtureSiteSources(), jobs, now)

  it("lists the open jobs in order with their row facts", () => {
    expect(view.open.jobs.map((j) => j.title)).toEqual([
      "Cleaning Operative – Healthcare",
      "Commercial Cleaner – Evenings",
      "Cleaning Supervisor",
      "Domestic Cleaner",
      "Deep Clean & Window Technician",
    ])
    expect(view.open.jobs[0]).toEqual({
      slug: "cleaning-operative-healthcare",
      href: "/careers/cleaning-operative-healthcare",
      title: "Cleaning Operative – Healthcare",
      category: "Healthcare",
      location: "Portlaoise, Co. Laois",
      type: "Part-time, Permanent",
      hours: "25 hrs/week, Mon–Fri 6am–11am",
      pay: "€14.50–€15.50/hr",
      posted: "Posted 3 days ago",
    })
    expect(view.open.count).toBe("5 open roles")
  })

  it("closed and past-closing jobs are previous openings with their closing date", () => {
    expect(view.previous.jobs.map((j) => j.title)).toEqual([
      "School Cleaning Operative",
      "Floor Care Technician",
      "Office Cleaner – Mornings",
    ])
    expect(view.previous.jobs[0]!.closed).toBe("Closed on 12 Sep 2026")
    const pastClosing = careersView(
      fixtureSiteSources(),
      [
        {
          ...jobs[0]!,
          content: { ...jobs[0]!.content, closingDate: "2026-11-01" },
        },
      ],
      now
    )
    expect(pastClosing.open.jobs).toEqual([])
    expect(pastClosing.previous.jobs[0]!.closed).toBe("Closed on 1 Nov 2026")
  })

  it("counts categories from open jobs only, with an All chip", () => {
    expect(view.open.filters.categories).toEqual([
      { name: "Healthcare", count: 1 },
      { name: "Commercial", count: 1 },
      { name: "Supervisory", count: 1 },
      { name: "Domestic", count: 1 },
      { name: "Specialist", count: 1 },
    ])
    expect(view.open.filters.allRoles).toBe("All Roles (5)")
    expect(view.open.filters.locations).toContain("Tullamore, Co. Offaly")
    expect(view.open.filters.types).toEqual([
      "Part-time, Permanent",
      "Full-time, Permanent",
      "Part-time",
    ])
  })

  it("leaves drafts (preview) out of previous openings", () => {
    const draft = careersView(
      fixtureSiteSources(),
      [{ ...jobs[0]!, published: false, publishedAt: null }],
      now
    )
    expect(draft.previous.jobs).toEqual([])
  })
})

describe("posted and closed wording", () => {
  it("counts days, then weeks, then months", () => {
    const at = (days: number) =>
      postedAgo(new Date(now.getTime() - days * DAY), now)
    expect(at(0)).toBe("today")
    expect(at(1)).toBe("yesterday")
    expect(at(3)).toBe("3 days ago")
    expect(at(7)).toBe("1 week ago")
    expect(at(14)).toBe("2 weeks ago")
    expect(at(70)).toBe("2 months ago")
  })

  it("closing dates read as 12 Sep 2026 in Irish time", () => {
    expect(closedOnDate(new Date("2026-09-12T23:30:00Z"))).toBe("13 Sep 2026")
    expect(closedOnDate("2026-11-28")).toBe("28 Nov 2026")
  })
})
