import { listQuery, sortParam } from "./list"
import { z } from "zod"

/** Same order as the DB enum application_status (server/db/schema/job-applications.ts). */
export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "spam",
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Not successful",
  spam: "Spam",
}

/** Still being decided (the inbox's "open" filter and badge). */
export const OPEN_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
]

export const APPLICATION_EVENT_TYPES = [
  "created",
  "status",
  "assigned",
  "note",
  "email",
] as const
export type ApplicationEventType = (typeof APPLICATION_EVENT_TYPES)[number]

export const APPLICATIONS_ENDPOINT = "/api/v1/public/applications"
export const APPLICATIONS_CONFIG_ENDPOINT = "/api/v1/public/applications/config"

/**
 * The answers of sections 02–04 of the form (stored as one jsonb value).
 * Choice answers hold the option text the applicant saw.
 */
export type ApplicationAnswers = {
  rightToWork: string
  permissionExpiry: string | null
  gardaVetting: boolean
  livedAbroad: boolean
  startDate: string
  hoursPerWeek: string
  shifts: string[]
  transport: boolean
  experience: string
  healthcareExperience: string | null
  recentRole: string | null
  certificates: string[]
}

export const applicationListQuery = listQuery.extend({
  status: z.enum([...APPLICATION_STATUSES, "open", "all"]).default("open"),
  jobId: z.uuid().optional(),
  sort: sortParam(["createdAt", "name"], { field: "createdAt", dir: "desc" }),
})
export type ApplicationListQuery = z.output<typeof applicationListQuery>
