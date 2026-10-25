import { z } from "zod"

import { iconCard, mediaRef, text } from "../common"

/** settings.sections.whyChooseUs — shared "Why Choose Us" section (D10). */
export const whyChooseUsSettings = z.object({
  background: mediaRef,
  eyebrow: text,
  title: text,
  description: text,
  features: z.array(iconCard).min(1),
})
export type WhyChooseUsSettings = z.infer<typeof whyChooseUsSettings>
