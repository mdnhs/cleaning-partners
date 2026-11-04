import { describe, expect, it } from "vitest"

import { applicationForm } from "@/lib/schemas/api/applications"

/** What a browser posts when only the required boxes are ticked. */
const minimal = {
  firstName: "Mary",
  surname: "Kelly",
  email: "mary@example.com",
  phone: "085 000 0000",
  town: "Portlaoise",
  rightToWork: "Irish or UK citizen",
  permissionExpiry: "",
  gardaVetting: "yes",
  livedAbroad: "no",
  startDate: "2026-12-01",
  hoursPerWeek: "20–30 hours",
  shifts: "Weekends",
  transport: "yes",
  experience: "None — happy to learn",
  declaration: "on",
  privacy: "on",
}

describe("applicationForm", () => {
  it("accepts a form with no certificates and keep-on-file unticked (browsers omit them)", () => {
    const parsed = applicationForm.safeParse(minimal)
    expect(parsed.error?.issues).toBeUndefined()
    expect(parsed.data).toMatchObject({
      certificates: [],
      keepOnFile: false,
      shifts: ["Weekends"],
      jobId: null,
    })
  })

  it("still refuses the form when the declaration is missing", () => {
    const { declaration: _, ...rest } = minimal
    expect(applicationForm.safeParse(rest).success).toBe(false)
  })
})
