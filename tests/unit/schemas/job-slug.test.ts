import { describe, expect, it } from "vitest"

import { createJobInput, jobSlugInput } from "@/lib/schemas/api/job-postings"

describe("job slugs", () => {
  it('refuse "apply": /careers/apply is the talent-pool form', () => {
    expect(createJobInput.safeParse({ slug: "apply", draft: {} }).success).toBe(
      false
    )
    expect(jobSlugInput.safeParse({ slug: "apply", version: 1 }).success).toBe(
      false
    )
    expect(
      createJobInput.safeParse({ slug: "apply-now", draft: {} }).success
    ).toBe(true)
  })
})
