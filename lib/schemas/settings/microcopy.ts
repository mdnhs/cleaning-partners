import { z } from "zod"

import { href, mediaRef, quoteCard, text } from "../common"

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
  /** The shared quote card; places may override it (quoteBox, helpCard). */
  quoteCard,
  /** The 404 page (unknown addresses and missing posts, jobs, services). */
  notFound: z.object({
    crumb: text,
    title: text,
    description: text,
    homeLabel: text,
  }),
})
export type MicrocopySettings = z.infer<typeof microcopySettings>
