import { z } from "zod"

import { href, link, mediaRef, text } from "../common"

/**
 * settings.sections.contact — the Contact section shared by / and /contact:
 * info cards, ICCA membership, social links and the quote box. Lines may
 * carry {placeholders} (lib/interpolate.ts); the enquiry form is page data.
 */
export const contactSectionSettings = z.object({
  eyebrow: text,
  title: text,
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
