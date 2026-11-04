import { Button, Heading, Link, Text } from "react-email"

import { EmailLayout, emailStyles } from "./layout"
import { MessageLines } from "./message-lines"

export type ApplicationNotificationEmailProps = {
  logoUrl: string
  /** Absolute `/admin/careers/applications/<id>` URL. */
  adminUrl: string
  application: {
    name: string
    email: string
    phone: string
    town: string
    /** null = sent from the talent pool form. */
    jobTitle: string | null
    jobReference: string | null
    availability: string
    hasCv: boolean
    note: string | null
    /** Already formatted in Europe/Dublin. */
    receivedAt: string
  }
}

const row = { ...emailStyles.text, margin: "0 0 8px" }

/** Staff notification for a new job application (careers). */
export function ApplicationNotificationEmail({
  logoUrl,
  adminUrl,
  application: a,
}: ApplicationNotificationEmailProps) {
  const role = a.jobTitle
    ? `${a.jobTitle}${a.jobReference ? ` (${a.jobReference})` : ""}`
    : "Talent pool (no particular role)"
  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`New job application from ${a.name}`}
    >
      <Heading as="h1" style={emailStyles.heading}>
        New job application
      </Heading>
      <Text style={row}>
        <strong>Role:</strong> {role}
      </Text>
      <Text style={row}>
        <strong>Name:</strong> {a.name}
      </Text>
      <Text style={row}>
        <strong>Email:</strong>{" "}
        <Link href={`mailto:${a.email}`} style={emailStyles.link}>
          {a.email}
        </Link>
      </Text>
      <Text style={row}>
        <strong>Phone:</strong> {a.phone}
      </Text>
      <Text style={row}>
        <strong>Town / County:</strong> {a.town}
      </Text>
      <Text style={row}>
        <strong>Availability:</strong> {a.availability}
      </Text>
      <Text style={row}>
        <strong>CV:</strong>{" "}
        {a.hasCv ? "attached (download it in the admin)" : "none"}
      </Text>
      <Text style={row}>
        <strong>Received:</strong> {a.receivedAt}
      </Text>
      {a.note?.trim() ? (
        <>
          <Text style={row}>
            <strong>Note:</strong>
          </Text>
          <Text style={{ ...emailStyles.text, whiteSpace: "pre-wrap" }}>
            <MessageLines text={a.note.trim()} />
          </Text>
        </>
      ) : null}
      <Button href={adminUrl} style={emailStyles.button}>
        Open in admin
      </Button>
      <Text style={emailStyles.small}>
        Reply to this email to answer {a.name} directly. The CV is never sent by
        email. Admin link:{" "}
        <Link href={adminUrl} style={emailStyles.link}>
          {adminUrl}
        </Link>
      </Text>
    </EmailLayout>
  )
}

export default ApplicationNotificationEmail
