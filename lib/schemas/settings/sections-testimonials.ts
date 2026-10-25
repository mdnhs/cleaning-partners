import { z } from "zod"

import { text } from "../common"

/**
 * settings.sections.testimonials — heading and labels of the testimonials
 * section; the testimonials themselves are a collection. {rating} in
 * starsAria is the testimonial's rating (1–5).
 */
export const testimonialsSectionSettings = z.object({
  eyebrow: text,
  title: text,
  starsAria: text,
  verifiedLabel: text,
})
export type TestimonialsSectionSettings = z.infer<
  typeof testimonialsSectionSettings
>
