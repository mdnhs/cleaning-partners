import { z } from "zod"

import { text } from "../common"

/**
 * settings.footer — footer copy. (The legal links are the published legal pages, listed by the admin under Legal pages.) The four contact lines are
 * composed at render: contact.addressLine1, addressLine2 (the footer's own
 * wording), contactOfficeLine and contact.email.
 */
export const footerSettings = z.object({
  tagline: text,
  quickLinksTitle: text,
  contactTitle: text,
  /** Footer wording of the address's second line (no "Ireland."). */
  addressLine2: text,
  /** Template; {office} and {officeExtension} are filled in at render. */
  contactOfficeLine: text,
  groupTitle: text,
  copyright: text,
})
export type FooterSettings = z.infer<typeof footerSettings>
