import { describe, expect, it } from "vitest"

import { jobsFixture } from "@/server/db/seed/fixtures/jobs"
import type { PublicJob } from "@/server/modules/job-postings/queries"
import { similarJobs } from "@/templates/careers/view"

const now = new Date("2026-11-04T12:00:00Z")
const DAY = 24 * 60 * 60_000
const all: PublicJob[] = jobsFixture().map((job, i) => ({
  id: `j${i}`,
  slug: job.slug,
  sortOrder: i,
  seo: {},
  content: job.content,
  publishedAt: new Date(now.getTime() - (i + 1) * DAY),
  closedAt: job.closedAt,
  published: true,
}))

describe("similarJobs", () => {
  it("other open jobs, same category first, then the newest; never closed ones", () => {
    const extraHealthcare: PublicJob = {
      ...all[0]!,
      id: "jx",
      slug: "healthcare-two",
      publishedAt: new Date(now.getTime() - 30 * DAY),
    }
    const picked = similarJobs(all[0]!, [...all, extraHealthcare], now)
    expect(picked.map((j) => j.slug)).toEqual([
      "healthcare-two",
      "commercial-cleaner-evenings",
      "cleaning-supervisor",
    ])
    expect(picked).toHaveLength(3)
  })

  it("never includes the job itself or a closed job", () => {
    const picked = similarJobs(all[1]!, all, now, 10)
    expect(picked.map((j) => j.slug)).not.toContain(
      "commercial-cleaner-evenings"
    )
    expect(picked.map((j) => j.slug)).not.toContain("school-cleaning-operative")
  })
})
