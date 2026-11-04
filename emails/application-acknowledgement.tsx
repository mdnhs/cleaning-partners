import { Heading, Text } from "react-email"

import { EmailLayout, emailStyles } from "./layout"

export type ApplicationAcknowledgementEmailProps = {
  logoUrl: string
  name: string
  siteName: string
  /** null = the talent pool form. */
  jobTitle: string | null
  /** The published "success" text of the careers form. */
  body: string
}

/** Confirmation to the applicant (settings.careers.acknowledgement). */
export function ApplicationAcknowledgementEmail({
  logoUrl,
  name,
  siteName,
  jobTitle,
  body,
}: ApplicationAcknowledgementEmailProps) {
  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`We received your application – ${siteName}`}
    >
      <Heading as="h1" style={emailStyles.heading}>
        {jobTitle
          ? `Thanks for applying: ${jobTitle}`
          : "Thanks for sending us your CV"}
      </Heading>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>{body}</Text>
    </EmailLayout>
  )
}

export default ApplicationAcknowledgementEmail
