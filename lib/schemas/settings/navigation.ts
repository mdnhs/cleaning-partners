import { z } from "zod"

import { href, link, text } from "../common"
import { linkPlaceholderProblems } from "../../link-rules"

/**
 * settings.navigation — header links (also the footer Quick Links), the
 * header button, the menu button's label and the breadcrumb's home crumb.
 * The active link is matched by href, never by label.
 */
/** Used for rows saved before `mobile` existed (also by the views). */
export const navigationMobileDefaults = {
  helpTitle: "Need help now?",
  callLabel: "Call Now",
  allServicesLabel: "View All Services",
  directionsLabel: "Get Directions",
}

/**
 * A header link. `children` is an optional dropdown (empty = plain link; the
 * Services link then lists the published services by itself). `inFooter` off
 * keeps it out of the footer's Quick links. Rows saved before these fields
 * read as plain links shown in the footer (no migration needed).
 */
export const navLink = z
  .object({
    label: text,
    href,
    children: z.array(link).default([]),
    inFooter: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    for (const [key, message] of Object.entries(linkPlaceholderProblems(value)))
      ctx.addIssue({ code: "custom", path: [key], message })
  })

export const navigationSettings = z.object({
  links: z.array(navLink).min(1),
  cta: link,
  menuAria: text,
  /** Rows saved before this field read as the default (no migration needed). */
  closeMenuAria: text.default("Close menu"),
  /** Labels of the phone menu and its bottom bar (the mobile design) */
  mobile: z
    .object({
      helpTitle: text,
      callLabel: text,
      allServicesLabel: text,
      directionsLabel: text,
    })
    .default(navigationMobileDefaults),
  breadcrumbHome: text,
  breadcrumbHomeHref: href,
})
export type NavigationSettings = z.infer<typeof navigationSettings>
