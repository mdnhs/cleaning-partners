import { describe, expect, it } from "vitest"

import { jobPostingJsonLd, parseHourlyOrYearlyPay } from "@/lib/seo/job-posting"
import type { PublicJob } from "@/server/modules/job-postings/queries"

import { healthcareJob } from "../helpers/job-fixture"

const job: PublicJob = {
  id: "j1",
  slug: "cleaning-operative-healthcare",
  sortOrder: 0,
  seo: {},
  content: healthcareJob,
  publishedAt: new Date("2026-11-01T09:00:00Z"),
  closedAt: null,
  published: true,
}
const org = {
  name: "Cleaning Partners Ltd.",
  url: "https://cleaningpartners.ie",
  addressCountry: "IE",
  currency: "EUR",
  timeZone: "Europe/Dublin",
}

describe("jobPostingJsonLd", () => {
  const ld = jobPostingJsonLd(
    job,
    "https://cleaningpartners.ie",
    org
  ) as unknown as Record<string, unknown>

  it("names the role, the employer and the dates", () => {
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Cleaning Operative – Healthcare",
      identifier: {
        "@type": "PropertyValue",
        name: org.name,
        value: "CP-2611-HC",
      },
      datePosted: "2026-11-01",
      validThrough: "2026-11-28T23:59:59+00:00",
      employmentType: "PART_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: org.name,
        sameAs: org.url,
      },
      url: "https://cleaningpartners.ie/careers/cleaning-operative-healthcare",
    })
    expect(String(ld.description)).toContain("Part-time, permanent role")
  })

  it("places the job in its town in Ireland", () => {
    expect(ld.jobLocation).toEqual({
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Portlaoise",
        addressRegion: "Co. Laois",
        addressCountry: "IE",
      },
    })
  })

  it("gives a salary only when the pay reads as a number range", () => {
    expect(ld.baseSalary).toEqual({
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: {
        "@type": "QuantitativeValue",
        minValue: 14.5,
        maxValue: 15.5,
        unitText: "HOUR",
      },
    })
    const mileage = jobPostingJsonLd(
      { ...job, content: { ...job.content, pay: "€15.00/hr + mileage" } },
      "https://cleaningpartners.ie",
      org
    ) as unknown as Record<string, unknown>
    expect(mileage.baseSalary).toBeUndefined()
  })

  it("leaves validThrough out without a closing date; summer dates are Irish time", () => {
    const open = jobPostingJsonLd(
      { ...job, content: { ...job.content, closingDate: null } },
      "https://cleaningpartners.ie",
      org
    ) as unknown as Record<string, unknown>
    expect(open.validThrough).toBeUndefined()
    const summer = jobPostingJsonLd(
      { ...job, content: { ...job.content, closingDate: "2026-07-10" } },
      "https://cleaningpartners.ie",
      org
    ) as unknown as Record<string, unknown>
    expect(summer.validThrough).toBe("2026-07-10T23:59:59+01:00")
  })

  it("takes the country and time zone from the organization settings", () => {
    const closing = {
      ...job,
      content: { ...job.content, closingDate: "2026-07-15" },
    }
    const uk = jobPostingJsonLd(closing, "https://cleaningpartners.ie", {
      ...org,
      addressCountry: "GB",
      currency: "GBP",
      timeZone: "Europe/London",
    }) as unknown as {
      jobLocation: { address: { addressCountry: string } }
      validThrough: string
    }
    expect(uk.jobLocation.address.addressCountry).toBe("GB")
    expect(uk.validThrough).toBe("2026-07-15T23:59:59+01:00")
    const ny = jobPostingJsonLd(closing, "https://cleaningpartners.ie", {
      ...org,
      timeZone: "America/New_York",
    }) as unknown as Record<string, unknown>
    expect(ny.validThrough).toBe("2026-07-15T23:59:59-04:00")
  })

  it("gives a salary only when the currency is the euro the pay is written in", () => {
    const eur = jobPostingJsonLd(
      job,
      "https://cleaningpartners.ie",
      org
    ) as unknown as {
      baseSalary?: { currency: string; value: { minValue: number } }
    }
    expect(eur.baseSalary?.currency).toBe("EUR")
    expect(eur.baseSalary?.value.minValue).toBe(14.5)
    const gbp = jobPostingJsonLd(job, "https://cleaningpartners.ie", {
      ...org,
      currency: "GBP",
    }) as unknown as Record<string, unknown>
    expect(gbp.baseSalary).toBeUndefined()
  })

  it("falls back to Irish time when the zone is not a real one", () => {
    const ld = jobPostingJsonLd(
      { ...job, content: { ...job.content, closingDate: "2026-07-15" } },
      "https://cleaningpartners.ie",
      { ...org, timeZone: "Mars/Olympus_Mons" }
    ) as unknown as Record<string, unknown>
    expect(ld.validThrough).toBe("2026-07-15T23:59:59+01:00")
  })
})

describe("parseHourlyOrYearlyPay", () => {
  it.each([
    ["€14.50–€15.50/hr", { min: 14.5, max: 15.5, unit: "HOUR" }],
    ["€14.50/hr", { min: 14.5, max: 14.5, unit: "HOUR" }],
    ["€33,000–€36,000/yr", { min: 33000, max: 36000, unit: "YEAR" }],
    ["€15.00/hr + mileage", null],
    ["Competitive", null],
  ] as const)("%s", (pay, expected) => {
    expect(parseHourlyOrYearlyPay(pay)).toEqual(expected)
  })
})
