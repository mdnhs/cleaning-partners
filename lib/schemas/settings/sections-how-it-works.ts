import { z } from "zod"

import { stepsSection } from "../common"

/** settings.sections.howItWorks — the numbered steps of the services page. */
export const howItWorksSettings = stepsSection
export type HowItWorksSettings = z.infer<typeof howItWorksSettings>
