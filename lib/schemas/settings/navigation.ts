import { z } from "zod"

import { href, link, text } from "../common"

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

export const navigationSettings = z.object({
  links: z.array(link).min(1),
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
