import { z } from "zod"

import { mediaRef, text } from "../common"

/** settings.sections.team — heading of the "Meet the team" section (members are a collection). */
export const teamSectionSettings = z.object({
  background: mediaRef,
  eyebrow: text,
  title: text,
  description: text,
})
export type TeamSectionSettings = z.infer<typeof teamSectionSettings>
