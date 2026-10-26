import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))

import { ALL_JOBS, RECURRING_JOBS } from "@/server/lib/jobs"

describe("job registry (Phase 5)", () => {
  it("registers the content jobs (incl. the triggered migrate-media) with their intervals", () => {
    expect(RECURRING_JOBS.map((j) => [j.name, j.everyMs])).toEqual([
      ["publish-scheduled", 30_000],
      ["prune-revisions", 24 * 60 * 60_000],
    ])
    expect(ALL_JOBS.map((j) => j.name)).toEqual([
      "publish-scheduled",
      "prune-revisions",
      "migrate-media",
      "delete-retired-media",
    ])
  })
})
