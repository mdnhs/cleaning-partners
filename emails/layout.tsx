import type { ReactNode } from "react"
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email"

const BRAND = "#11b1d1"
const NAVY = "#28648f"
const FOOTER_ADDRESS = "Derryguile, Mountmellick, Co. Laois, R32 YX49"
const FOOTER_EMAIL = "info@cleaningpartners.ie"

/** Absolute logo URL for an origin: mail clients cannot resolve a relative `src`. */
export function emailLogoUrl(origin: string): string {
  return new URL("/images/home/logo.png", origin).toString()
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

/**
 * Link lifetime in words: up to an hour in minutes, then whole hours, then
 * whole days from two days on (60 → "60 minutes", 1440 → "24 hours",
 * 10080 → "7 days").
 */
export function formatExpiry(minutes: number): string {
  if (minutes >= 2 * 1440 && minutes % 1440 === 0)
    return plural(minutes / 1440, "day")
  if (minutes > 60 && minutes % 60 === 0) return plural(minutes / 60, "hour")
  return plural(minutes, "minute")
}

// Shared frame for transactional emails. Plain inline styles: email clients
// ignore the site's CSS.
export const emailStyles = {
  body: {
    backgroundColor: "#f4f9fb",
    fontFamily: "Arial, Helvetica, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderTop: `4px solid ${BRAND}`,
    margin: "0 auto",
    maxWidth: 520,
    padding: 32,
  },
  heading: { color: NAVY, fontSize: 22, margin: "0 0 16px" },
  text: {
    color: "#3f3f46",
    fontSize: 15,
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: NAVY,
    borderRadius: 6,
    color: "#ffffff",
    display: "inline-block",
    fontSize: 15,
    fontWeight: 700,
    padding: "12px 20px",
    textDecoration: "none",
  },
  logo: { display: "block", height: "auto", margin: "0 0 24px", width: 119 },
  small: {
    color: "#71717a",
    fontSize: 13,
    lineHeight: "20px",
    margin: "16px 0 0",
  },
  link: { color: NAVY, wordBreak: "break-all" as const },
}

export function EmailLayout({
  preview,
  logoUrl,
  children,
}: {
  preview: string
  logoUrl: string
  children: ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section>
            <Img
              src={logoUrl}
              alt="Cleaning Partners"
              width={119}
              height={107}
              style={emailStyles.logo}
            />
          </Section>
          {children}
          <Hr />
          <Text style={emailStyles.small}>
            Cleaning Partners · {FOOTER_ADDRESS} · {FOOTER_EMAIL}
            <br />
            This is an automated message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
