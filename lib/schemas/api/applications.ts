import { z } from "zod"

import { leadNoteInput, oneLine, optionalLine } from "./leads"
import { listQuery, sortParam } from "./list"

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

export const applicationExportQuery = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum([...APPLICATION_STATUSES, "open", "all"]).default("all"),
  jobId: z.uuid().optional(),
})
export type ApplicationExportQuery = z.output<typeof applicationExportQuery>

export const updateApplicationInput = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    assigneeId: z.uuid().nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.assigneeId !== undefined, {
    message: "Change the status or the assignee",
  })
export type UpdateApplicationInput = z.output<typeof updateApplicationInput>

/** Same rules as an enquiry note. */
export const applicationNoteInput = leadNoteInput

export type ApplicationPerson = { id: string; name: string }
export type ApplicationListItem = {
  id: string
  /** First name and surname. */
  name: string
  email: string
  phone: string
  town: string
  /** null = the talent pool (or the job was deleted: jobTitle still says which). */
  jobId: string | null
  jobTitle: string | null
  jobReference: string | null
  status: ApplicationStatus
  assignee: ApplicationPerson | null
  hasCv: boolean
  createdAt: string
}
export type ApplicationEventItem = {
  id: string
  type: ApplicationEventType
  body: string | null
  actor: ApplicationPerson | null
  createdAt: string
}
export type ApplicationDto = ApplicationListItem & {
  firstName: string
  surname: string
  address: string | null
  eircode: string | null
  answers: ApplicationAnswers
  note: string | null
  heardAbout: string | null
  declaration: boolean
  privacyConsent: boolean
  keepOnFile: boolean
  sourcePage: string | null
  /** The uploaded CV (download from the /cv route), or none. */
  cv: { name: string; mime: string; size: number } | null
  updatedAt: string
  events: ApplicationEventItem[]
}

export const APPLICATION_EXPORT_LIMIT = 50_000
export const APPLICATION_CSV_HEADER = [
  "Received (UTC)",
  "Status",
  "Job",
  "Job reference",
  "First name",
  "Surname",
  "Email",
  "Phone",
  "Address",
  "Town / County",
  "Eircode",
  "Right to work",
  "Permission expiry",
  "Garda vetting",
  "Lived abroad 6+ months",
  "Earliest start",
  "Hours per week",
  "Shifts",
  "Driving / transport",
  "Cleaning experience",
  "Healthcare experience",
  "Most recent role",
  "Certificates",
  "Note",
  "Heard about",
  "Keep on file",
  "CV file",
  "Assignee",
  "Source page",
  "ID",
] as const

const required = (max: number) =>
  oneLine(max).pipe(z.string().min(1, "Please fill in this field."))
const yesNo = z
  .enum(["yes", "no"], "Choose yes or no")
  .transform((v) => v === "yes")
const isoDay = z.iso.date("Enter a date")
/** A ticked checkbox posts "on" (or "true"); anything else is unticked. */
// z.preprocess (not .transform) so a key the browser left out still parses.
const ticked = z.preprocess((v) => v === "on" || v === "true", z.boolean())
const mustTick = (message: string) =>
  z
    .unknown()
    .refine((v) => v === "on" || v === "true", message)
    .transform(() => true)
/** A repeated form field (checkbox group) as a list; one value or none too. */
const many = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(oneLine(200)).max(20)
)

/**
 * POST /api/v1/public/applications (multipart, the careers form). Shapes
 * only: the choices are checked against the published Careers page by the
 * service, the CV by server/lib/cv.ts.
 */
export const applicationForm = z.object({
  jobId: z.preprocess(
    (v) => (typeof v === "string" && v !== "" ? v : null),
    z.uuid().nullable()
  ),
  firstName: required(100),
  surname: required(100),
  email: z
    .string()
    .trim()
    .max(320, "Use at most 320 characters")
    .pipe(z.email("Enter a valid email address.")),
  phone: required(50),
  address: optionalLine(300),
  town: required(200),
  eircode: optionalLine(20),
  rightToWork: required(200),
  permissionExpiry: z
    .string()
    .default("")
    .transform((v) => (v ? v : null))
    .pipe(isoDay.nullable()),
  gardaVetting: yesNo,
  livedAbroad: yesNo,
  startDate: isoDay,
  hoursPerWeek: required(200),
  shifts: many.pipe(z.array(z.string()).min(1, "Choose at least one shift.")),
  transport: yesNo,
  experience: required(200),
  healthcareExperience: optionalLine(200),
  recentRole: optionalLine(300),
  certificates: many,
  note: z
    .string()
    .trim()
    .max(4000, "Use at most 4000 characters")
    .default("")
    .transform((v) => (v ? v : null)),
  heardAbout: optionalLine(200),
  declaration: mustTick("Please confirm this."),
  privacy: mustTick("Please agree to this."),
  keepOnFile: ticked,
  sourcePage: optionalLine(300),
  turnstileToken: z.string().max(4096).optional(),
  website: z.unknown().optional(),
})
export type ApplicationForm = z.output<typeof applicationForm>

export type ApplicationPublicConfig = { turnstileSiteKey: string | null }
