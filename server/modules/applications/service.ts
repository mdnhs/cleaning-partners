import "server-only"

import { createElement } from "react"

import { ApplicationAcknowledgementEmail } from "@/emails/application-acknowledgement"
import { ApplicationNotificationEmail } from "@/emails/application-notification"
import { emailLogoUrl } from "@/emails/layout"
import { isOpenJob } from "@/lib/careers/open"
import {
  hasPermission,
  parseRoles,
  type PermissionRequest,
} from "@/lib/auth/permissions"
import { CSV_BOM, toCsv } from "@/lib/csv"
import { formatDateTime, isoDate } from "@/lib/format"
import {
  APPLICATION_CSV_HEADER,
  APPLICATION_EXPORT_LIMIT,
  APPLICATION_STATUS_LABELS,
  type ApplicationDto,
  type ApplicationEventType,
  type ApplicationExportQuery,
  type ApplicationForm,
  type ApplicationListItem,
  type ApplicationListQuery,
  type ApplicationPublicConfig,
  type ApplicationStatus,
  type UpdateApplicationInput,
} from "@/lib/schemas/api/applications"
import type { Paginated } from "@/lib/schemas/api/list"
import type { TurnstileConfig } from "@/lib/schemas/integrations"
import { getDb } from "@/server/db/client"
import { getEnv } from "@/server/env"
import { writeAudit } from "@/server/lib/audit"
import { deleteCv, openCv, prepareCv, storeCv } from "@/server/lib/cv"
import type { Actor } from "@/server/lib/actor"
import { AppError, forbidden, notFound } from "@/server/lib/errors"
import { hashIp } from "@/server/lib/ip"
import { mailer } from "@/server/lib/mailer"
import { publicOrigin } from "@/server/lib/site-origin"
import { verifyTurnstileToken } from "@/server/lib/turnstile"
import { readIntegrationConfig } from "@/server/modules/integrations/service"
import { findJobById } from "@/server/modules/job-postings/repo"
import { readPublishedPage } from "@/server/modules/pages/service"
import { findStaffUser } from "@/server/modules/leads/repo"
import { retentionCutoff } from "@/server/modules/leads/service"
import { readPublishedSettings } from "@/server/modules/settings/service"

import * as repo from "./repo"

const DEFAULT_SITE_NAME = "Cleaning Partners"
const errorName = (err: unknown) =>
  err instanceof Error ? err.name : "unknown error"

async function readTurnstile(): Promise<TurnstileConfig | null | "unreadable"> {
  try {
    return await readIntegrationConfig("integrations.turnstile")
  } catch (err) {
    console.error(
      `[applications] Turnstile settings could not be read (${errorName(err)})`
    )
    return "unreadable"
  }
}

/** Site key for the invisible widget, only while spam protection is on. */
export async function publicApplicationConfig(): Promise<ApplicationPublicConfig> {
  const config = await readTurnstile()
  if (config === "unreadable" || !config?.enabled || !config.siteKey)
    return { turnstileSiteKey: null }
  return { turnstileSiteKey: config.siteKey }
}

/** true = enabled and verified; false = not enabled; 422 when the token fails. */
async function assertHuman(
  token: string | undefined,
  ip: string | null
): Promise<boolean> {
  const config = await readTurnstile()
  if (config === "unreadable" || !config?.enabled) return false
  if (await verifyTurnstileToken({ secret: config.secretKey, token, ip }))
    return true
  throw new AppError("VALIDATION_FAILED", "Spam check failed", {
    fieldErrors: {
      turnstileToken: ["Spam check failed. Reload the page and try again."],
    },
  })
}

const honeypotFilled = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== "string" || value.trim() !== "")

const invalid = (fieldErrors: Record<string, string[]>) =>
  new AppError("VALIDATION_FAILED", "Some fields need attention", {
    fieldErrors,
  })

/**
 * Every choice must be one of the published Careers form's options (a
 * tampered form cannot store arbitrary text in those fields).
 */
async function assertKnownChoices(input: ApplicationForm) {
  const page = await readPublishedPage("careers")
  if (!page) throw new AppError("INTERNAL", "The careers page is not published")
  const o = page.apply.options
  const errors: Record<string, string[]> = {}
  const one = (field: string, value: string | null, options: string[]) => {
    if (value !== null && !options.includes(value))
      errors[field] = ["Choose an option from the list."]
  }
  const all = (field: string, values: string[], options: string[]) => {
    if (values.some((v) => !options.includes(v)))
      errors[field] = ["Choose options from the list."]
  }
  one("rightToWork", input.rightToWork, o.rightToWork)
  one("hoursPerWeek", input.hoursPerWeek, o.hours)
  one("experience", input.experience, o.years)
  one("healthcareExperience", input.healthcareExperience, o.healthcare)
  one("heardAbout", input.heardAbout, o.heardAbout)
  all("shifts", input.shifts, o.shifts)
  all("certificates", input.certificates, o.certificates)
  if (Object.keys(errors).length > 0) throw invalid(errors)
  return page
}

/** The job applied for, which must be open now; null = the talent pool. */
async function openJobOrThrow(jobId: string | null, now: Date) {
  if (jobId === null) return null
  const job = await findJobById(getDb(), jobId)
  const open =
    job !== null &&
    isOpenJob(
      {
        published: job.published,
        closedAt: job.closedAt,
        closingDate: job.published?.closingDate ?? null,
      },
      now
    )
  if (!job || !open)
    throw new AppError("CONFLICT", "This role is no longer taking applications")
  return job.published!
}

/**
 * Public careers form. Honeypot submissions look successful but store
 * nothing. The CV is stored first, then the row in one transaction (the CV
 * is deleted again if that fails). Emails run after the commit and never
 * fail the request: their outcome is written on the application's events.
 */
export async function submitApplication(
  input: ApplicationForm,
  cvFile: unknown,
  meta: { ip: string | null; now?: Date }
): Promise<{ ok: true; applicationId: string | null }> {
  const now = meta.now ?? new Date()
  const humanVerified = await assertHuman(input.turnstileToken, meta.ip)
  if (honeypotFilled(input.website)) {
    console.info("[applications] honeypot filled; submission dropped")
    return { ok: true, applicationId: null }
  }
  const page = await assertKnownChoices(input)
  const job = await openJobOrThrow(input.jobId, now)
  const cv = await prepareCv(cvFile)
  const stored = cv ? await storeCv(cv, now) : null
  let row: repo.ApplicationRow
  try {
    row = await getDb().transaction(async (tx) => {
      const created = await repo.insertApplication(tx, {
        jobId: input.jobId,
        jobTitle: job?.title ?? null,
        jobReference: job?.reference ?? null,
        firstName: input.firstName,
        surname: input.surname,
        email: input.email,
        phone: input.phone,
        address: input.address,
        town: input.town,
        eircode: input.eircode,
        answers: {
          rightToWork: input.rightToWork,
          permissionExpiry: input.permissionExpiry,
          gardaVetting: input.gardaVetting,
          livedAbroad: input.livedAbroad,
          startDate: input.startDate,
          hoursPerWeek: input.hoursPerWeek,
          shifts: input.shifts,
          transport: input.transport,
          experience: input.experience,
          healthcareExperience: input.healthcareExperience,
          recentRole: input.recentRole,
          certificates: input.certificates,
        },
        note: input.note,
        heardAbout: input.heardAbout,
        declaration: input.declaration,
        privacyConsent: input.privacy,
        keepOnFile: input.keepOnFile,
        cvKey: stored?.key ?? null,
        cvDriver: stored?.driver ?? null,
        cvName: cv?.originalName ?? null,
        cvMime: cv?.mime ?? null,
        cvSize: cv?.size ?? null,
        sourcePage: input.sourcePage,
        ipHash: meta.ip ? hashIp(meta.ip) : null,
      })
      await repo.insertApplicationEvent(tx, {
        applicationId: created.id,
        type: "created",
        body: job ? `Applied for ${job.title}` : "Sent to the talent pool",
        actorId: null,
      })
      await writeAudit(tx, null, {
        action: "application.created",
        entityType: "application",
        entityId: created.id,
      })
      return created
    })
  } catch (err) {
    if (stored) await deleteCv(stored.key, stored.driver).catch(() => undefined)
    throw err
  }
  try {
    await notify(row, { humanVerified, successBody: page.apply.success.body })
  } catch (err) {
    console.error(`[applications] notification step failed (${errorName(err)})`)
  }
  return { ok: true, applicationId: row.id }
}

async function notify(
  row: repo.ApplicationRow,
  opts: { humanVerified: boolean; successBody: string }
) {
  const db = getDb()
  const [careers, leads, site] = await Promise.all([
    readPublishedSettings("careers", db),
    readPublishedSettings("leads", db),
    readPublishedSettings("site", db),
  ])
  const siteName = site?.name ?? DEFAULT_SITE_NAME
  const logoUrl = emailLogoUrl(publicOrigin(null))
  const name = `${row.firstName} ${row.surname}`
  const outcomes: string[] = []
  const recipients = careers?.recipients.length
    ? careers.recipients
    : (leads?.recipients ?? [])
  if (recipients.length === 0) {
    outcomes.push(
      "Staff notification not sent: no recipients in Settings ▸ Job applications or Enquiries."
    )
  } else {
    const { delivered } = await mailer.send({
      to: recipients,
      replyTo: row.email,
      template: "application-notification",
      subject: row.jobTitle
        ? `Job application: ${row.jobTitle} – ${name}`
        : `CV for the talent pool – ${name}`,
      react: createElement(ApplicationNotificationEmail, {
        logoUrl,
        adminUrl: new URL(
          `/admin/careers/applications/${row.id}`,
          getEnv().BETTER_AUTH_URL
        ).toString(),
        application: {
          name,
          email: row.email,
          phone: row.phone,
          town: row.town,
          jobTitle: row.jobTitle,
          jobReference: row.jobReference,
          availability: `${row.answers.hoursPerWeek}; ${row.answers.shifts.join(", ")}`,
          hasCv: row.cvKey !== null,
          note: row.note,
          receivedAt: formatDateTime(row.createdAt),
        },
      }),
    })
    outcomes.push(
      delivered
        ? `Staff notification sent to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`
        : "Staff notification not sent: email is not configured or failed."
    )
  }
  // As for enquiries: without a verified human check the acknowledgement
  // would let anyone send our email to any address.
  const acknowledge = careers?.acknowledgement ?? true
  if (acknowledge && !opts.humanVerified) {
    outcomes.push("Acknowledgement skipped (no Turnstile).")
  } else if (acknowledge) {
    const { delivered } = await mailer.send({
      to: row.email,
      template: "application-acknowledgement",
      subject: `We received your application – ${siteName}`,
      react: createElement(ApplicationAcknowledgementEmail, {
        logoUrl,
        name: row.firstName,
        siteName,
        jobTitle: row.jobTitle,
        body: opts.successBody,
      }),
    })
    outcomes.push(
      delivered
        ? "Acknowledgement sent to the applicant."
        : "Acknowledgement not sent: email is not configured or failed."
    )
  }
  for (const body of outcomes)
    await repo.insertApplicationEvent(db, {
      applicationId: row.id,
      type: "email",
      body,
      actorId: null,
    })
}

// ------------------------------------------------------------ admin inbox

function assertCan(actor: Actor, req: PermissionRequest) {
  if (!hasPermission(actor.roles, req)) throw forbidden()
}
const canWorkApplications = (role: string | null, banned: boolean | null) =>
  !banned && hasPermission(parseRoles(role), { lead: ["update"] })

function toListItem(row: repo.ApplicationWithAssignee): ApplicationListItem {
  return {
    id: row.id,
    name: `${row.firstName} ${row.surname}`,
    email: row.email,
    phone: row.phone,
    town: row.town,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    jobReference: row.jobReference,
    status: row.status,
    assignee: row.assigneeId
      ? { id: row.assigneeId, name: row.assigneeName ?? "Deleted user" }
      : null,
    hasCv: row.cvKey !== null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listApplications(
  actor: Actor,
  query: ApplicationListQuery
): Promise<Paginated<ApplicationListItem>> {
  assertCan(actor, { lead: ["read"] })
  const { rows, total } = await repo.listApplicationRows(getDb(), {
    filters: { status: query.status, jobId: query.jobId, q: query.q },
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  })
  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
  }
}

export async function getApplication(
  actor: Actor,
  id: string
): Promise<ApplicationDto> {
  assertCan(actor, { lead: ["read"] })
  const db = getDb()
  const row = await repo.findApplicationRow(db, id)
  if (!row) throw notFound("Application")
  const events = await repo.listApplicationEventRows(db, id)
  return {
    ...toListItem(row),
    firstName: row.firstName,
    surname: row.surname,
    address: row.address,
    eircode: row.eircode,
    answers: row.answers,
    note: row.note,
    heardAbout: row.heardAbout,
    declaration: row.declaration,
    privacyConsent: row.privacyConsent,
    keepOnFile: row.keepOnFile,
    sourcePage: row.sourcePage,
    cv:
      row.cvKey && row.cvName && row.cvMime
        ? { name: row.cvName, mime: row.cvMime, size: row.cvSize ?? 0 }
        : null,
    updatedAt: row.updatedAt.toISOString(),
    events: events.map((e) => ({
      id: e.id,
      type: e.type as ApplicationEventType,
      body: e.body,
      actor: e.actorId
        ? { id: e.actorId, name: e.actorName ?? "Deleted user" }
        : null,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

export async function updateApplication(
  actor: Actor,
  id: string,
  input: UpdateApplicationInput
): Promise<ApplicationDto> {
  assertCan(actor, { lead: ["update"] })
  await getDb().transaction(async (tx) => {
    const row = await repo.lockApplicationRow(tx, id)
    if (!row) throw notFound("Application")
    const patch: { status?: ApplicationStatus; assigneeId?: string | null } = {}
    const diff: Record<string, { from: unknown; to: unknown }> = {}
    const events: { type: ApplicationEventType; body: string }[] = []
    if (input.status !== undefined && input.status !== row.status) {
      patch.status = input.status
      diff.status = { from: row.status, to: input.status }
      events.push({
        type: "status",
        body: `${APPLICATION_STATUS_LABELS[row.status]} → ${APPLICATION_STATUS_LABELS[input.status]}`,
      })
    }
    if (input.assigneeId !== undefined && input.assigneeId !== row.assigneeId) {
      let name: string | null = null
      if (input.assigneeId) {
        const user = await findStaffUser(tx, input.assigneeId)
        if (!user || !canWorkApplications(user.role, user.banned))
          throw new AppError("VALIDATION_FAILED", "Invalid input", {
            fieldErrors: {
              assigneeId: ["Choose someone who can work on enquiries"],
            },
          })
        name = user.name
      }
      patch.assigneeId = input.assigneeId
      diff.assigneeId = { from: row.assigneeId, to: input.assigneeId }
      events.push({
        type: "assigned",
        body: name ? `Assigned to ${name}` : "Unassigned",
      })
    }
    if (events.length === 0) return
    await repo.updateApplicationRow(tx, id, patch)
    for (const event of events)
      await repo.insertApplicationEvent(tx, {
        applicationId: id,
        ...event,
        actorId: actor.userId,
      })
    await writeAudit(tx, actor, {
      action: "application.updated",
      entityType: "application",
      entityId: id,
      diff,
    })
  })
  return getApplication(actor, id)
}

export async function addApplicationNote(
  actor: Actor,
  id: string,
  input: { body: string }
): Promise<ApplicationDto> {
  assertCan(actor, { lead: ["update"] })
  await getDb().transaction(async (tx) => {
    if (!(await repo.lockApplicationRow(tx, id))) throw notFound("Application")
    await repo.insertApplicationEvent(tx, {
      applicationId: id,
      type: "note",
      body: input.body,
      actorId: actor.userId,
    })
    await writeAudit(tx, actor, {
      action: "application.note_added",
      entityType: "application",
      entityId: id,
    })
  })
  return getApplication(actor, id)
}

/** The CV for download, or 404 when the application has none (or the file is gone). */
export async function openApplicationCv(actor: Actor, id: string) {
  assertCan(actor, { lead: ["read"] })
  const row = await repo.findApplicationRow(getDb(), id)
  if (!row) throw notFound("Application")
  if (!row.cvKey || !row.cvDriver) throw notFound("CV")
  const stream = await openCv(row.cvKey, row.cvDriver)
  if (!stream) throw notFound("CV")
  return {
    stream,
    name: row.cvName ?? "cv",
    mime: row.cvMime ?? "application/octet-stream",
  }
}

/** Removes the stored CV; a storage failure is logged, never blocks the delete. */
async function removeCvFile(cv: {
  cvKey: string | null
  cvDriver: "disk" | "r2" | null
}) {
  if (!cv.cvKey || !cv.cvDriver) return
  try {
    await deleteCv(cv.cvKey, cv.cvDriver)
  } catch (err) {
    console.error(`[applications] CV delete failed (${errorName(err)})`)
  }
}

export async function deleteApplication(
  actor: Actor,
  id: string
): Promise<{ ok: true }> {
  assertCan(actor, { lead: ["delete"] })
  const cv = await getDb().transaction(async (tx) => {
    const removed = await repo.deleteApplicationRow(tx, id)
    if (!removed) throw notFound("Application")
    await writeAudit(tx, actor, {
      action: "application.deleted",
      entityType: "application",
      entityId: id,
    })
    return removed
  })
  await removeCvFile(cv)
  return { ok: true }
}

const yesNoCell = (v: boolean) => (v ? "yes" : "no")

export async function exportApplications(
  actor: Actor,
  query: ApplicationExportQuery,
  now: Date = new Date(),
  { limit = APPLICATION_EXPORT_LIMIT }: { limit?: number } = {}
): Promise<{ csv: string; filename: string; count: number }> {
  assertCan(actor, { lead: ["export"] })
  const db = getDb()
  const rows = await repo.exportApplicationRows(
    db,
    { status: query.status, jobId: query.jobId, q: query.q },
    limit + 1
  )
  if (rows.length > limit)
    throw new AppError(
      "VALIDATION_FAILED",
      `More than ${limit.toLocaleString("en-IE")} applications match. Narrow the filters to export.`
    )
  const csv =
    CSV_BOM +
    toCsv(
      APPLICATION_CSV_HEADER,
      rows.map((r) => [
        r.createdAt.toISOString(),
        APPLICATION_STATUS_LABELS[r.status],
        r.jobTitle,
        r.jobReference,
        r.firstName,
        r.surname,
        r.email,
        r.phone,
        r.address,
        r.town,
        r.eircode,
        r.answers.rightToWork,
        r.answers.permissionExpiry,
        yesNoCell(r.answers.gardaVetting),
        yesNoCell(r.answers.livedAbroad),
        r.answers.startDate,
        r.answers.hoursPerWeek,
        r.answers.shifts.join("; "),
        yesNoCell(r.answers.transport),
        r.answers.experience,
        r.answers.healthcareExperience,
        r.answers.recentRole,
        r.answers.certificates.join("; "),
        r.note,
        r.heardAbout,
        yesNoCell(r.keepOnFile),
        r.cvName,
        r.assigneeId ? (r.assigneeName ?? "Deleted user") : null,
        r.sourcePage,
        r.id,
      ])
    )
  await writeAudit(db, actor, {
    action: "application.exported",
    entityType: "application",
    diff: {
      count: rows.length,
      filters: Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key]) => key),
    },
  })
  return {
    csv,
    filename: `applications-${isoDate(now)}.csv`,
    count: rows.length,
  }
}

export async function applicationBadge(
  actor: Actor
): Promise<{ newApplications: number }> {
  assertCan(actor, { lead: ["read"] })
  return { newApplications: await repo.countNewApplications(getDb()) }
}

/**
 * Daily retention purge (spec: Settings › Careers retentionMonths):
 * applications older than that, and their CV files. Audits the count only.
 */
export async function purgeExpiredApplications(
  now: Date = new Date()
): Promise<{ deleted: number }> {
  const db = getDb()
  const config = await readPublishedSettings("careers", db)
  const months = config?.retentionMonths ?? 12
  const cutoff = retentionCutoff(now, months)
  const removed = await db.transaction(async (tx) => {
    const rows = await repo.deleteApplicationsCreatedBefore(tx, cutoff)
    if (rows.length > 0)
      await writeAudit(tx, null, {
        action: "application.purged",
        entityType: "application",
        diff: { count: rows.length, cutoff: cutoff.toISOString() },
      })
    return rows
  })
  for (const cv of removed) await removeCvFile(cv)
  return { deleted: removed.length }
}
