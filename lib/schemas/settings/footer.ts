import { z } from "zod"

import { link, text } from "../common"

/**
 * settings.footer — footer copy. (The legal links are the published legal pages, listed by the admin under Legal pages.) The four contact lines are
 * composed at render: contact.addressLine1, contact.addressLine2,
 * contactOfficeLine and contact.email.
 */
export const footerSettings = z.object({
  tagline: text,
  quickLinksTitle: text,
  contactTitle: text,
  /** Template; {office} and {officeExtension} are filled in at render. */
  contactOfficeLine: text,
  groupTitle: text,
  copyright: text,
  /** Shown after the legal links; null hides it. */
  loginLink: link.nullable(),
})
export type FooterSettings = z.infer<typeof footerSettings>
