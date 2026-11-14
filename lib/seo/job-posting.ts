import type { JobPosting, WithContext } from "schema-dts"

import { SITE_TIME_ZONE, siteTimeZone } from "@/lib/format"
import { jobPath } from "@/lib/schemas/api/job-postings"
import type { JobContent } from "@/lib/schemas/content/job"

// schema.org JobPosting for a job page (Google for Jobs). Pure builder.

type JobInput = {
  slug: string
  content: JobContent
  publishedAt: Date | null
}

const PAY =
  /^€\s?([\d,]+(?:\.\d+)?)(?:\s?[–-]\s?€?\s?([\d,]+(?:\.\d+)?))?\s?\/\s?(hr|hour|yr|year)$/i

/** "€14.50–€15.50/hr" → 14.5–15.5 HOUR; anything else (extras, words) → null. */
export function parseHourlyOrYearlyPay(
  pay: string
): { min: number; max: number; unit: "HOUR" | "YEAR" } | null {
  const match = PAY.exec(pay.trim())
  if (!match) return null
  const num = (value: string) => Number(value.replaceAll(",", ""))
  const min = num(match[1]!)
  const max = match[2] ? num(match[2]) : min
  const unit = /^h/i.test(match[3]!) ? "HOUR" : "YEAR"
  return Number.isFinite(min) && Number.isFinite(max) && max >= min
    ? { min, max, unit }
    : null
}

const offsetFormats = new Map<string, Intl.DateTimeFormat>()

function offsetIn(day: string, timeZone: string): string {
  let format = offsetFormats.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "shortOffset",
    })
    offsetFormats.set(timeZone, format)
  }
  const name =
    format
      .formatToParts(new Date(`${day}T12:00:00Z`))
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT"
  const match = /GMT([+-])(\d{1,2})(?::(\d\d))?/.exec(name)
  if (!match) return "+00:00"
  return `${match[1]}${match[2]!.padStart(2, "0")}:${match[3] ?? "00"}`
}

/**
 * "+01:00" / "-04:00": the zone's UTC offset on that day, taken at 12:00 UTC.
 * Assumes daylight-saving switches happen in the small hours (true for
 * Europe and the Americas), so noon gives the offset in force at 23:59:59
 * on the closing day. An unknown zone falls back to Irish time
 * (siteTimeZone), so a direct caller with a bad value never throws.
 */
function zoneOffset(day: string, timeZone: string): string {
  try {
    return offsetIn(day, siteTimeZone(timeZone))
  } catch {
    return offsetIn(day, SITE_TIME_ZONE)
  }
}

/** The plain text of the paragraphs, for the description. */
const textOf = (about: JobContent["about"]) =>
  about.content
    .map((paragraph) =>
      (paragraph.content ?? [])
        .map((node) => ("text" in node ? node.text : " "))
        .join("")
    )
    .join("\n\n")

export function jobPostingJsonLd(
  job: JobInput,
  origin: string,
  org: {
    name: string
    url: string
    /** ISO 3166-1 alpha-2, e.g. "IE" (settings seo.defaults.organization). */
    addressCountry: string
    /** ISO 4217, e.g. "EUR" (settings seo.defaults.organization). */
    currency: string
    /** A valid IANA zone (siteTimeZone(settings.site.timezone)). */
    timeZone: string
  }
): WithContext<JobPosting> {
  const c = job.content
  const [locality, ...rest] = c.location.split(",").map((part) => part.trim())
  // parseHourlyOrYearlyPay only reads "€" amounts, so the number is euros:
  // stating it in another currency would be wrong structured data. Omit it.
  const salary = org.currency === "EUR" ? parseHourlyOrYearlyPay(c.pay) : null
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: c.title,
    description: `${c.summary}\n\n${textOf(c.about)}`,
    identifier: {
      "@type": "PropertyValue",
      name: org.name,
      value: c.reference,
    },
    ...(job.publishedAt
      ? { datePosted: job.publishedAt.toISOString().slice(0, 10) }
      : {}),
    ...(c.closingDate
      ? {
          validThrough: `${c.closingDate}T23:59:59${zoneOffset(c.closingDate, org.timeZone)}`,
        }
      : {}),
    employmentType: c.schemaEmploymentType,
    hiringOrganization: {
      "@type": "Organization",
      name: org.name,
      sameAs: org.url,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: locality,
        ...(rest.length > 0 ? { addressRegion: rest.join(", ") } : {}),
        addressCountry: org.addressCountry,
      },
    },
    ...(salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: org.currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: salary.min,
              maxValue: salary.max,
              unitText: salary.unit,
            },
          },
        }
      : {}),
    url: `${origin}${jobPath(job.slug)}`,
  }
}
