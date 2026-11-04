import type { JobPosting, WithContext } from "schema-dts"

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

const OFFSET = new Intl.DateTimeFormat("en-IE", {
  timeZone: "Europe/Dublin",
  timeZoneName: "shortOffset",
})

/** "+01:00" in Irish summer time, "+00:00" in winter, for that day. */
function irishOffset(day: string): string {
  const name =
    OFFSET.formatToParts(new Date(`${day}T12:00:00Z`)).find(
      (part) => part.type === "timeZoneName"
    )?.value ?? "GMT"
  const match = /GMT([+-])(\d{1,2})(?::(\d\d))?/.exec(name)
  if (!match) return "+00:00"
  return `${match[1]}${match[2]!.padStart(2, "0")}:${match[3] ?? "00"}`
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
  org: { name: string; url: string }
): WithContext<JobPosting> {
  const c = job.content
  const [locality, ...rest] = c.location.split(",").map((part) => part.trim())
  const salary = parseHourlyOrYearlyPay(c.pay)
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
          validThrough: `${c.closingDate}T23:59:59${irishOffset(c.closingDate)}`,
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
        addressCountry: "IE",
      },
    },
    ...(salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "EUR",
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
