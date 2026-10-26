import { Heading, Text } from "react-email"

import { EmailLayout, emailStyles } from "./layout"
import { MessageLines } from "./message-lines"

export type LeadAcknowledgementEmailProps = {
  /** Absolute logo URL (emailLogoUrl), computed by the caller. */
  logoUrl: string
  name: string
  /** Published site name; the caller falls back to "Cleaning Partners". */
  siteName: string
  /** The visitor's message; the quote block is left out when blank. */
  message: string
  /** settings.contact.phone24h; the urgent line is left out when null/blank. */
  phone24h: string | null
}

/** Optional confirmation to the visitor (settings.leads.acknowledgement). */
export function LeadAcknowledgementEmail({
  logoUrl,
  name,
  siteName,
  message,
  phone24h,
}: LeadAcknowledgementEmailProps) {
  const body = message.trim()
  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`We received your request – ${siteName}`}
    >
      <Heading as="h1" style={emailStyles.heading}>
        Thanks for your quote request
      </Heading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        We&apos;ve received your request and will be in touch shortly.
      </Text>
      {phone24h?.trim() ? (
        <Text style={emailStyles.text}>
          If it&apos;s urgent, call us on {phone24h.trim()}.
        </Text>
      ) : null}
      {body ? (
        <>
          <Text style={emailStyles.small}>Your message:</Text>
          <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
            <MessageLines text={body} />
          </Text>
        </>
      ) : null}
    </EmailLayout>
  )
}

export default LeadAcknowledgementEmail
