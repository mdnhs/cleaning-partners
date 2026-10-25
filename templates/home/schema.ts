import { z } from "zod"

import { link, mediaRef, text } from "@/lib/schemas/common"

/** Page "home" (/): hero, services intro and the blog strip. Shared sections are settings. */
export const homeTemplate = z.object({
  hero: z.object({
    background: mediaRef,
    title: text,
    subtitle: text,
    primaryCta: link,
    secondaryCta: link,
    memberLabel: text,
    memberLogo: mediaRef,
    memberLogoAlt: text,
  }),
  services: z.object({
    imageA: mediaRef,
    imageAAlt: text,
    imageB: mediaRef,
    imageBAlt: text,
    eyebrow: text,
    title: text,
    description: text,
    items: z.array(z.object({ title: text, description: text })).min(1),
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
