import { z } from "zod"

/**
 * settings.careers — who hears about new job applications, the applicant's
 * acknowledgement and how long applications (with their CVs) are kept.
 * No recipients = the Enquiries recipients (settings.leads) are used.
 */
export const careersSettings = z.object({
  recipients: z.array(z.email()).max(20),
  retentionMonths: z.number().int().min(1).max(36).default(12),
  acknowledgement: z.boolean().default(true),
})
export type CareersSettings = z.infer<typeof careersSettings>
