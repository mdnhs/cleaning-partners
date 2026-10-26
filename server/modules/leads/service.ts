import "server-only"

import { createElement } from "react"

import { LeadAcknowledgementEmail } from "@/emails/lead-acknowledgement"
import { emailLogoUrl } from "@/emails/layout"
import { LeadNotificationEmail } from "@/emails/lead-notification"
import { formatDateTime } from "@/lib/format"
import { interpolate } from "@/lib/interpolate"
import { submittedAttribution } from "@/lib/leads/attribution"
import type { TurnstileConfig } from "@/lib/schemas/integrations"
import type { LeadPublicConfig, LeadSubmission } from "@/lib/schemas/api/leads"
import { getDb } from "@/server/db/client"
import { getEnv } from "@/server/env"
import { writeAudit } from "@/server/lib/audit"
import { AppError } from "@/server/lib/errors"
import { hashIp } from "@/server/lib/ip"
import { mailer } from "@/server/lib/mailer"
import { publicOrigin } from "@/server/lib/site-origin"
import { verifyTurnstileToken } from "@/server/lib/turnstile"
import { readIntegrationConfig } from "@/server/modules/integrations/service"
import {
  readPublishedPage,
  readPublishedServiceExtras,
} from "@/server/modules/pages/service"
import { readPublishedServiceTitles } from "@/server/modules/services/service"
import { readPublishedSettings } from "@/server/modules/settings/service"

import * as repo from "./repo"

const DEFAULT_SUBJECT = "Quote request from {name}"
const DEFAULT_SERVICE_FALLBACK = "Not sure"
const DEFAULT_SITE_NAME = "Cleaning Partners"
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`
const errorName = (err: unknown) =>
  err instanceof Error ? err.name : "unknown error"

async function readTurnstile(): Promise<TurnstileConfig | null | "unreadable"> {
  try {
    return await readIntegrationConfig("integrations.turnstile")
  } catch (err) {
    console.error(
      `[leads] Turnstile settings could not be read (${errorName(err)})`
    )
    return "unreadable"
  }
}

/** Site key for the invisible widget, only while spam protection is on. */
export async function publicFormConfig(): Promise<LeadPublicConfig> {
  const config = await readTurnstile()
  if (config === "unreadable" || !config?.enabled || !config.siteKey)
    return { turnstileSiteKey: null }
  return { turnstileSiteKey: config.siteKey }
}

/**
 * Turnstile check. true = enabled and verified for this request; false =
 * not enabled (or unreadable: real enquiries must not be lost, logged
 * above). Throws 422 when enabled and the token fails.
 */
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

/**
 * The service must be a published service title or one of the contact
 * page's published extra options (R7-3). Blank (null) is allowed.
 */
async function assertKnownService(service: string | null): Promise<void> {
  if (service === null) return
  const db = getDb()
  const [titles, extras] = await Promise.all([
    readPublishedServiceTitles(db),
    readPublishedServiceExtras(db),
  ])
  if (titles.includes(service) || extras.includes(service)) return
  throw new AppError("VALIDATION_FAILED", "Invalid input", {
    fieldErrors: { service: ["Choose a service from the list"] },
  })
}

/**
 * Public quote form (spec §9). Honeypot submissions look successful but
 * store nothing. Emails run after the commit and never fail the request.
 */
export async function submitLead(
  input: LeadSubmission,
  meta: { ip: string | null }
): Promise<{ ok: true; leadId: string | null }> {
  // Turnstile first: with it on, a bot without a token gets 422 whether
  // or not it filled the honeypot.
  const humanVerified = await assertHuman(input.turnstileToken, meta.ip)
  if (honeypotFilled(input.website)) {
    console.info("[leads] honeypot filled; submission dropped")
    return { ok: true, leadId: null }
  }
  await assertKnownService(input.service)
  const attribution = submittedAttribution(input.attribution)
  if (attribution === null && input.attribution != null)
    // Never the value itself: it is visitor-supplied and may hold PII.
    console.warn("[leads] invalid attribution dropped; enquiry kept")
  const lead = await getDb().transaction(async (tx) => {
    const row = await repo.insertLead(tx, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      address: input.address,
      service: input.service,
      message: input.message,
      consent: input.consent,
      sourcePage: input.sourcePage ?? null,
      attribution,
      ipHash: meta.ip ? hashIp(meta.ip) : null,
    })
    await repo.insertLeadEvent(tx, {
      leadId: row.id,
      type: "created",
      body: input.sourcePage
        ? `Sent from ${input.sourcePage}`
        : "Sent from the website",
      actorId: null,
    })
    await writeAudit(tx, null, {
      action: "lead.created",
      entityType: "lead",
      entityId: row.id,
    })
    return row
  })
  try {
    await notifyNewLead(lead, { humanVerified })
  } catch (err) {
    console.error(`[leads] notification step failed (${errorName(err)})`)
  }
  return { ok: true, leadId: lead.id }
}

/** Any value except undefined, null or a blank string fires the honeypot. */
function honeypotFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false
  return typeof value !== "string" || value.trim() !== ""
}

async function notifyNewLead(
  lead: repo.LeadRow,
  { humanVerified }: { humanVerified: boolean }
): Promise<void> {
  const db = getDb()
  const [leadsSettings, site, contact, contactPage] = await Promise.all([
    readPublishedSettings("leads", db),
    readPublishedSettings("site", db),
    readPublishedSettings("contact", db),
    readPublishedPage("contact", db),
  ])
  const siteName = site?.name ?? DEFAULT_SITE_NAME
  const quoteForm = contactPage?.quoteForm
  const logoUrl = emailLogoUrl(publicOrigin(null))
  const outcomes: string[] = []

  const recipients = leadsSettings?.recipients ?? []
  if (recipients.length === 0) {
    outcomes.push(
      "Staff notification not sent: no recipients in Settings ▸ Leads."
    )
  } else {
    const { delivered } = await mailer.send({
      to: recipients,
      replyTo: lead.email,
      template: "lead-notification",
      subject: interpolate(quoteForm?.mailSubject ?? DEFAULT_SUBJECT, {
        name: lead.name,
      }),
      react: createElement(LeadNotificationEmail, {
        logoUrl,
        adminUrl: new URL(
          `/admin/leads/${lead.id}`,
          getEnv().BETTER_AUTH_URL
        ).toString(),
        serviceFallback:
          quoteForm?.fields.service.fallback ?? DEFAULT_SERVICE_FALLBACK,
        lead: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          address: lead.address,
          service: lead.service,
          message: lead.message,
          sourcePage: lead.sourcePage,
          receivedAt: formatDateTime(lead.createdAt),
        },
      }),
    })
    outcomes.push(
      delivered
        ? `Staff notification sent to ${plural(recipients.length, "recipient")}.`
        : "Staff notification not sent: email is not configured or failed."
    )
  }

  // Without a verified human check the acknowledgement would let anyone
  // send our email to any address (relay): owner ruling, Turnstile required.
  if (leadsSettings?.acknowledgement && !humanVerified) {
    outcomes.push("Acknowledgement skipped (no Turnstile).")
  } else if (leadsSettings?.acknowledgement) {
    const { delivered } = await mailer.send({
      to: lead.email,
      template: "lead-acknowledgement",
      subject: `We received your request – ${siteName}`,
      react: createElement(LeadAcknowledgementEmail, {
        logoUrl,
        name: lead.name,
        siteName,
        message: lead.message,
        phone24h: contact?.phone24h ?? null,
      }),
    })
    outcomes.push(
      delivered
        ? "Acknowledgement sent to the visitor."
        : "Acknowledgement not sent: email is not configured or failed."
    )
  }

  for (const body of outcomes)
    await repo.insertLeadEvent(db, {
      leadId: lead.id,
      type: "email",
      body,
      actorId: null,
    })
}
