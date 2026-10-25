import { z } from "zod"

import { href, link, text } from "../common"

/**
 * settings.navigation — header links (also the footer Quick Links), the
 * header button, the menu button's label and the breadcrumb's home crumb.
 * The active link is matched by href, never by label.
 */
export const navigationSettings = z.object({
  links: z.array(link).min(1),
  cta: link,
  menuAria: text,
  breadcrumbHome: text,
  breadcrumbHomeHref: href,
})
export type NavigationSettings = z.infer<typeof navigationSettings>
