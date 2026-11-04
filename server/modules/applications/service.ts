import "server-only"

import { createElement } from "react"

import { ApplicationAcknowledgementEmail } from "@/emails/application-acknowledgement"
import { ApplicationNotificationEmail } from "@/emails/application-notification"
import { emailLogoUrl } from "@/emails/layout"
import { isOpenJob } from "@/lib/careers/open"
import { formatDateTime } from "@/lib/format"
import type {
  ApplicationForm,
  ApplicationPublicConfig,
} from "@/lib/schemas/api/applications"
import type { TurnstileConfig } from "@/lib/schemas/integrations"
import { getDb } from "@/server/db/client"
import { getEnv } from "@/server/env"
import { writeAudit } from "@/server/lib/audit"
import { deleteCv, prepareCv, storeCv } from "@/server/lib/cv"
import { AppError } from "@/server/lib/errors"
import { hashIp } from "@/server/lib/ip"
import { mailer } from "@/server/lib/mailer"
import { publicOrigin } from "@/server/lib/site-origin"
import { verifyTurnstileToken } from "@/server/lib/turnstile"
import { readIntegrationConfig } from "@/server/modules/integrations/service"
import { findJobById } from "@/server/modules/job-postings/repo"
import { readPublishedPage } from "@/server/modules/pages/service"
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
