import { z } from "zod"

import { href, text } from "../common"

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
  /** Shown on the careers pages (job and apply sidebars, talent pool). */
  recruitmentEmail: z.email(),
  hours: text,
  addressLine1: text,
  addressLine2: text,
  /** Text of every {quoteLabel} button (header, hero, quote cards…). */
  quoteLabel: text,
  /**
   * Where every {quoteHref} button goes. A real address: it is itself the
   * value of {quoteHref}, so it can never be a placeholder.
   */
  quoteHref: href.refine(
    (value) => !value.includes("{"),
    "Use a real address such as /contact#quote"
  ),
})
export type ContactSettings = z.infer<typeof contactSettings>
