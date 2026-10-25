import { z } from "zod"

import {
  link,
  mediaRef,
  pageHeroText,
  paragraphsText,
  text,
} from "@/lib/schemas/common"

/** Page "about" (/about): hero, Our Story and the stats band. Clients, why-choose-us, team etc. are settings. */
export const aboutTemplate = z.object({
  hero: pageHeroText,
  story: z.object({
    imageA: mediaRef,
    imageAAlt: text,
    imageB: mediaRef,
    imageBAlt: text,
    eyebrow: text,
    title: text,
    paragraphs: paragraphsText,
    sectorsHeading: text,
    sectors: z.array(text).min(1),
    cta: link,
  }),
  stats: z.array(z.object({ value: text, label: text })).min(1),
})
export type AboutTemplate = z.infer<typeof aboutTemplate>
