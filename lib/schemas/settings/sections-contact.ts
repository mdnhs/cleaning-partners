import { z } from "zod"

import { href, link, mediaRef, text } from "../common"

/**
 * settings.sections.contact — the Contact section shared by / and /contact:
 * info cards, ICCA membership, social links and the quote box. Lines may
 * carry {placeholders} (lib/interpolate.ts); the enquiry form is page data.
 */
/** Used for rows saved before `mobile` existed (also by the views). */
export const contactMobileDefaults = {
  callLabel: "Call",
  emailLabel: "Email",
  directionsLabel: "Directions",
  mapLabel: "Map",
  followLabel: "Follow us",
}

export const contactSectionSettings = z.object({
  eyebrow: text,
  title: text,
  /** Shown under the title on a phone (the mobile design) */
  description: text.optional(),
  /** Short labels of the phone layout's action pills */
  mobile: z
    .object({
      callLabel: text,
      emailLabel: text,
      directionsLabel: text,
      mapLabel: text,
      followLabel: text,
    })
    .default(contactMobileDefaults),
  infoCards: z
    .array(
      z.object({
        title: text,
        icon: mediaRef,
        lines: z.array(text).min(1),
      })
    )
    .min(1),
  memberLogo: mediaRef,
  memberLogoAlt: text,
  memberTitle: text,
  memberSubtitle: text,
  socials: z.array(z.object({ label: text, icon: mediaRef, href })),
  quoteBox: z.object({ title: text, body: text, cta: link }),
})
export type ContactSectionSettings = z.infer<typeof contactSectionSettings>
