import type { z } from "zod"

import { iconCardsSection, mediaRef } from "../common"

/** settings.sections.whyChooseUs — shared "Why Choose Us" section (D10). */
export const whyChooseUsSettings = iconCardsSection.extend({
  background: mediaRef,
})
export type WhyChooseUsSettings = z.infer<typeof whyChooseUsSettings>
