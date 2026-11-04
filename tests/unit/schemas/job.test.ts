import { describe, expect, it } from "vitest"

import {
  JOB_OFFER_ICONS,
  JOB_SCHEMA_TYPES,
  jobContent,
  jobSchema,
} from "@/lib/schemas/content/job"

import { healthcareJob } from "../helpers/job-fixture"

describe("jobContent", () => {
  it("parses the Figma healthcare job", () => {
    expect(jobContent.parse(healthcareJob)).toEqual(healthcareJob)
    expect(
      jobSchema.parse({
        ...healthcareJob,
        slug: "cleaning-operative-healthcare",
      }).slug
    ).toBe("cleaning-operative-healthcare")
  })

  it("needs at least one essential requirement", () => {
    expect(
      jobContent.safeParse({ ...healthcareJob, essential: [] }).success
    ).toBe(false)
  })

  it("refuses an offer icon outside the set", () => {
    expect(
      jobContent.safeParse({
        ...healthcareJob,
        offers: [{ icon: "rocket", text: "Rocket" }],
      }).success
    ).toBe(false)
    expect(JOB_OFFER_ICONS).toEqual([
      "pay",
      "training",
      "uniform",
      "roster",
      "leave",
      "career",
    ])
  })

  it("closingDate is a real calendar date or null", () => {
    expect(
      jobContent.safeParse({ ...healthcareJob, closingDate: "2026-11-31" })
        .success
    ).toBe(false)
    expect(
      jobContent.safeParse({ ...healthcareJob, closingDate: "28/11/2026" })
        .success
    ).toBe(false)
    expect(
      jobContent.safeParse({ ...healthcareJob, closingDate: null }).success
    ).toBe(true)
  })

  it("desirable may be empty; schema employment type is a schema.org value", () => {
    expect(
      jobContent.safeParse({ ...healthcareJob, desirable: [] }).success
    ).toBe(true)
    expect(JOB_SCHEMA_TYPES).toEqual([
      "FULL_TIME",
      "PART_TIME",
      "TEMPORARY",
      "CONTRACTOR",
    ])
    expect(
      jobContent.safeParse({ ...healthcareJob, schemaEmploymentType: "SHIFT" })
        .success
    ).toBe(false)
  })
})
