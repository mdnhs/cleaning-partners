import { z } from "zod"

import { mediaRef, paragraphsText, slug, text } from "../common"

/**
 * The draft/published payload of a service, in CP's shape (lib/services.ts,
 * R3-3). slug and sortOrder are columns; SEO is the shared `seo` object.
 * `overview` is a TipTap doc of paragraphs only (one <p> each).
 */
export const serviceContent = z.object({
  title: text,
  icon: mediaRef,
  cover: mediaRef,
  summary: text,
  tags: z.array(text),
  heroDescription: text,
  overviewTitle: text,
  overview: paragraphsText,
  included: z.array(text).min(1),
  places: z.array(text),
})

/** A service as edited: slug + payload. */
export const serviceSchema = serviceContent.extend({ slug })

export type ServiceContent = z.infer<typeof serviceContent>
export type ServiceInput = z.infer<typeof serviceSchema>
