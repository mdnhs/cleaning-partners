import { describe, expect, it } from "vitest"

import {
  JOB_OFFER_ICONS,
  JOB_SCHEMA_TYPES,
  jobContent,
  jobSchema,
} from "@/lib/schemas/content/job"

const paragraphs = (...texts: string[]) => ({
  type: "doc" as const,
  content: texts.map((text) => ({
    type: "paragraph" as const,
    content: [{ type: "text" as const, text }],
  })),
})

/** Figma node 497:285, "Cleaning Operative – Healthcare". */
export const healthcareJob = {
  title: "Cleaning Operative – Healthcare",
  reference: "CP-2611-HC",
  category: "Healthcare",
  location: "Portlaoise, Co. Laois",
  employmentType: "Part-time, Permanent",
  schemaEmploymentType: "PART_TIME" as const,
  hoursShort: "25 hrs/week, Mon–Fri",
  hours: "25 hrs/week, Mon–Fri 6am–11am",
  pay: "€14.50–€15.50/hr",
  payDetail: "€14.50–€15.50 per hour",
  startDate: "Immediate start",
  closingDate: "2026-11-28",
  summary:
    "Part-time, permanent role at a busy primary care centre in Portlaoise.",
  about: paragraphs(
    "We’re looking for a reliable, detail-focused Cleaning Operative to join our healthcare team at a busy primary care centre in Portlaoise."
  ),
  responsibilities: [
    "Clean and disinfect consultation rooms, waiting areas, toilets and staff areas to a set schedule",
  ],
  essential: ["Legal right to work in Ireland"],
  desirable: ["Previous cleaning experience, ideally in healthcare"],
  offerIntro:
    "Competitive pay of €14.50–€15.50 per hour depending on experience, plus:",
  offers: [
    { icon: "pay" as const, text: "Weekly pay by bank transfer" },
    { icon: "training" as const, text: "Paid training & certification" },
  ],
}

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
