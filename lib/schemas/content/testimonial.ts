import { z } from "zod"

import { text } from "../common"

/**
 * A customer testimonial (R3-3). Immediate-publish like the small
 * collections; sortOrder is a column. The stars and the starsAria label
 * derive from `rating`.
 */
export const testimonialSchema = z.object({
  name: text,
  initials: z.string().min(1, "Required").max(4),
  quote: text,
  rating: z.number().int().min(1).max(5).default(5),
})
export type TestimonialInput = z.infer<typeof testimonialSchema>
