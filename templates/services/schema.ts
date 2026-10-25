import { z } from "zod"

import { link, mediaRef, pageHero, text } from "@/lib/schemas/common"

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
    helpCard: z.object({
      icon: mediaRef,
      title: text,
      body: text,
      cta: link,
      /** {office} and {officeExtension} come from Settings › Contact. */
      callLabel: text,
    }),
  }),
  detail: z.object({
    breadcrumbHref: text,
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
