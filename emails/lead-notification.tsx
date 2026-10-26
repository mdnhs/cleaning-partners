import { Button, Heading, Link, Text } from "react-email"

import { EmailLayout, emailStyles } from "./layout"
import { MessageLines } from "./message-lines"

export type LeadNotificationEmailProps = {
  /** Absolute logo URL (emailLogoUrl), computed by the caller. */
  logoUrl: string
  /** Absolute `/admin/leads/<id>` URL. */
  adminUrl: string
  /** Shown when no service was picked: the published quoteForm service fallback. */
  serviceFallback: string
  lead: {
    name: string
    email: string
    phone: string | null
    /** Optional (CP's form never sends it); the row is left out when blank. */
    company?: string | null
    service: string | null
    /** Address / Eircode; the row is left out when null or blank. */
    address?: string | null
    /** The row is left out when blank. */
    message: string
    sourcePage: string | null
    /** Already formatted in Europe/Dublin. */
    receivedAt: string
  }
}

const row = { ...emailStyles.text, margin: "0 0 8px" }

/** Staff notification for a new quote request (spec §9). */
export function LeadNotificationEmail({
  logoUrl,
  adminUrl,
  serviceFallback,
  lead,
}: LeadNotificationEmailProps) {
  const address = lead.address?.trim()
  const message = lead.message.trim()
  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`New quote request from ${lead.name}`}
    >
      <Heading as="h1" style={emailStyles.heading}>
        New quote request
      </Heading>
      <Text style={row}>
        <strong>Name:</strong> {lead.name}
      </Text>
      <Text style={row}>
        <strong>Email:</strong>{" "}
        <Link href={`mailto:${lead.email}`} style={emailStyles.link}>
          {lead.email}
        </Link>
      </Text>
      {lead.phone ? (
        <Text style={row}>
          <strong>Phone:</strong> {lead.phone}
        </Text>
      ) : null}
      {lead.company?.trim() ? (
        <Text style={row}>
          <strong>Company:</strong> {lead.company}
        </Text>
      ) : null}
      <Text style={row}>
        <strong>Service:</strong> {lead.service || serviceFallback}
      </Text>
      {address ? (
        <Text style={row}>
          <strong>Address / Eircode:</strong> {address}
        </Text>
      ) : null}
      {lead.sourcePage ? (
        <Text style={row}>
          <strong>Source page:</strong> {lead.sourcePage}
        </Text>
      ) : null}
      <Text style={row}>
        <strong>Received:</strong> {lead.receivedAt}
      </Text>
      {message ? (
        <>
          <Text style={row}>
            <strong>Message:</strong>
          </Text>
          <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
            <MessageLines text={message} />
          </Text>
        </>
      ) : null}
      <Button href={adminUrl} style={emailStyles.button}>
        Open in admin
      </Button>
      <Text style={emailStyles.small}>
        Reply to this email to answer {lead.name} directly. Admin link:{" "}
        <Link href={adminUrl} style={emailStyles.link}>
          {adminUrl}
        </Link>
      </Text>
    </EmailLayout>
  )
}

export default LeadNotificationEmail
