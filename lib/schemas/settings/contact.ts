import { z } from "zod"

import { text } from "../common"

/**
 * settings.contact — numbers and addresses edited once. tel: hrefs are
 * derived at render (lib/interpolate.ts telHref); the office extension is
 * its own field so "Tel: {office} Ext {officeExtension}" stays editable.
 */
export const contactSettings = z.object({
  phone24h: text,
  /** Template of the 24 hour line; {phone24h} is filled in at render. */
  phone24Label: text,
  office: text,
  officeExtension: text,
  mobile: text,
  email: z.email(),
  hours: text,
  addressLine1: text,
  addressLine2: text,
})
export type ContactSettings = z.infer<typeof contactSettings>
