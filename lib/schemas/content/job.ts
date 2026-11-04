import { z } from "zod"

import { paragraphsText, slug, text } from "../common"

/** The icons a "What We Offer" tile can show (components/careers maps them). */
export const JOB_OFFER_ICONS = [
  "pay",
  "training",
  "uniform",
  "roster",
  "leave",
  "career",
] as const
export type JobOfferIcon = (typeof JOB_OFFER_ICONS)[number]

/** schema.org JobPosting employmentType values a job can declare. */
export const JOB_SCHEMA_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "TEMPORARY",
  "CONTRACTOR",
] as const

/** A calendar date "YYYY-MM-DD" (real days only: no 31 November). */
export const isoDate = z.iso.date("Use a date like 2026-11-28")

/**
 * The draft/published payload of a job posting (careers). slug, sortOrder
 * and closedAt are columns; SEO is the shared `seo` object. Display strings
 * are free text ("Part-time, Permanent", "€14.50–€15.50/hr") because the
 * office writes them the way candidates read them.
 */
export const jobContent = z.object({
  title: text,
  reference: text,
  category: text,
  location: text,
  employmentType: text,
  schemaEmploymentType: z.enum(JOB_SCHEMA_TYPES),
  hoursShort: text,
  hours: text,
  pay: text,
  payDetail: text,
  startDate: text,
  /** Last day applications are taken (Irish date); null = open until closed by hand. */
  closingDate: isoDate.nullable(),
  summary: text,
  about: paragraphsText,
  responsibilities: z.array(text).min(1).max(20),
  essential: z.array(text).min(1).max(20),
  desirable: z.array(text).max(20),
  offerIntro: text,
  offers: z
    .array(z.object({ icon: z.enum(JOB_OFFER_ICONS), text }))
    .max(12),
})
export type JobContent = z.infer<typeof jobContent>

/** A job as edited: slug + payload. */
export const jobSchema = jobContent.extend({ slug })
export type JobInput = z.infer<typeof jobSchema>
