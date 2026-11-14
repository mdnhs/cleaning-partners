import { z } from "zod"

import { link, mediaRef, slug, text } from "@/lib/schemas/common"

/** Page "home" (/): hero, services intro and the blog strip. Shared sections are settings. */
export const homeTemplate = z.object({
  hero: z.object({
    background: mediaRef,
    /**
     * Optional MP4/WebM played muted over the background image (the image
     * stays as its poster and fallback). The field is named backgroundVideo:
     * server/lib/media-usages.ts accepts only videos in fields of that name.
     */
    backgroundVideo: mediaRef.nullable().optional(),
    title: text,
    subtitle: text,
    primaryCta: link,
    secondaryCta: link,
    memberLabel: text,
  }),
  services: z.object({
    imageA: mediaRef,
    imageAAlt: text,
    imageB: mediaRef,
    imageBAlt: text,
    eyebrow: text,
    title: text,
    description: text,
    /**
     * Services from the collection: the name and link come from the service.
     * Each service at most once (a repeat would be the same link twice).
     */
    items: z
      .array(z.object({ service: slug, description: text }))
      .min(1)
      .max(6)
      .superRefine((items, ctx) => {
        const seen = new Set<string>()
        items.forEach((item, index) => {
          if (seen.has(item.service))
            ctx.addIssue({
              code: "custom",
              path: [index, "service"],
              message: "This service is already in the list",
            })
          seen.add(item.service)
        })
      }),
    itemIcon: mediaRef,
    moreText: text,
    cta: link,
  }),
  blog: z.object({
    eyebrow: text,
    title: text,
    description: text,
    /** How many recent articles the strip shows. */
    count: z.number().int().min(1).max(12),
  }),
})
export type HomeTemplate = z.infer<typeof homeTemplate>
