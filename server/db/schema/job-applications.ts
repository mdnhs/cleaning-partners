import "server-only"

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core"

import type { ApplicationAnswers } from "@/lib/schemas/api/applications"

import { id, timestamps, tsz } from "./_shared"
import { users } from "./auth"
import { jobPostings } from "./job-postings"

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "spam",
] as const
export const applicationStatus = pgEnum(
  "application_status",
  APPLICATION_STATUSES
)

/**
 * Job applications (careers form). The job's title and reference are
 * copied in, so an application still reads right after the job is edited or
 * deleted. The CV (optional) lives in private storage under cv_key; it has
 * no media row and is only served to enquiry handlers.
 */
export const jobApplications = pgTable(
  "job_applications",
  {
    id: id(),
    /** null = the talent pool form (no particular job), or the job was deleted. */
    jobId: uuid("job_id").references(() => jobPostings.id, {
      onDelete: "set null",
    }),
    jobTitle: text("job_title"),
    jobReference: text("job_reference"),
    firstName: text("first_name").notNull(),
    surname: text("surname").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address"),
    town: text("town").notNull(),
    eircode: text("eircode"),
    answers: jsonb("answers").$type<ApplicationAnswers>().notNull(),
    note: text("note"),
    heardAbout: text("heard_about"),
    declaration: boolean("declaration").notNull(),
    privacyConsent: boolean("privacy_consent").notNull(),
    /** Keep on file for future roles (talent pool consent). */
    keepOnFile: boolean("keep_on_file").notNull().default(false),
    cvKey: text("cv_key"),
    cvDriver: text("cv_driver").$type<"disk" | "r2">(),
    cvName: text("cv_name"),
    cvMime: text("cv_mime"),
    cvSize: integer("cv_size"),
    status: applicationStatus("status").notNull().default("new"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourcePage: text("source_page"),
    /** HMAC of the client IP (purpose "application-ip"), never the raw IP. */
    ipHash: text("ip_hash"),
    ...timestamps(),
  },
  (t) => [
    index("job_applications_created_at_idx").on(t.createdAt),
    index("job_applications_status_idx").on(t.status),
    index("job_applications_job_id_idx").on(t.jobId),
  ]
)

export const jobApplicationEvents = pgTable(
  "job_application_events",
  {
    id: id(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body"),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: tsz("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("job_application_events_application_id_idx").on(t.applicationId),
  ]
)
