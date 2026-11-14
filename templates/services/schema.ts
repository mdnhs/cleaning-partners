import { z } from "zod"

import {
  href,
  link,
  mediaRef,
  pageHero,
  quoteCardOverrides,
  text,
} from "@/lib/schemas/common"

/** Page "services" (/services) and the copy around a service detail page. Cards come from the services collection. */
export const servicesTemplate = z.object({
  hero: pageHero,
  grid: z.object({
    eyebrow: text,
    title: text,
    intro: text,
    priceBadge: text,
    /** {title} is the service name. */
    learnMoreAria: text,
    learnMore: text,
    quoteCta: link,
    /** Overrides of the shared quote card (Settings › Microcopy); null = shared. */
    helpCard: quoteCardOverrides.extend({ icon: mediaRef }),
  }),
  detail: z.object({
    breadcrumbHref: href,
    breadcrumbLabel: text,
    overviewEyebrow: text,
    includedHeading: text,
    placesHeading: text,
    sidebarAria: text,
    sidebarHeading: text,
    officeHours: z.object({ title: text, hours: text }),
  }),
})
export type ServicesTemplate = z.infer<typeof servicesTemplate>
