import { z } from "zod"

import { href, link, mediaRef, text } from "../common"

/**
 * settings.microcopy — labels, icons and small cards shared by several
 * pages. Page-specific copy lives in the page's template.
 */
export const microcopySettings = z.object({
  viewAllPosts: text,
  viewAllPostsHref: href,
  breadcrumbAria: text,
  checkIcon: mediaRef,
  searchIcon: mediaRef,
  searchLabel: text,
  searchPlaceholder: text,
  readArticle: text,
  quoteCard: z.object({
    title: text,
    body: text,
    /** Template; {office} and {officeExtension} are filled in at render. */
    telLabel: text,
    cta: link,
  }),
})
export type MicrocopySettings = z.infer<typeof microcopySettings>
