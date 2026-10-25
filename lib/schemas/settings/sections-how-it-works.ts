import { z } from "zod"

import { text } from "../common"

/** settings.sections.howItWorks — the numbered steps of the services page. */
export const howItWorksSettings = z.object({
  eyebrow: text,
  title: text,
  steps: z.array(z.object({ title: text, description: text })).min(1),
})
export type HowItWorksSettings = z.infer<typeof howItWorksSettings>
