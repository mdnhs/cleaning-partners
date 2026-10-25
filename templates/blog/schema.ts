import { z } from "zod"

import { href, pageHero, slug, text } from "@/lib/schemas/common"

/** Page "blog" (/blog): list labels, featured article, page size, and the copy around an article page. */
export const blogTemplate = z.object({
  hero: pageHero,
  /** Slug of the featured article; null = the newest. */
  featuredArticle: slug.nullable(),
  pageSize: z.number().int().min(1).max(24),
  allLabel: text,
  filterAria: text,
  featuredLabel: text,
  emptyState: text,
  paginationAria: text,
  prevAria: text,
  prevLabel: text,
  nextAria: text,
  nextLabel: text,
  article: z.object({
    breadcrumbBlogHref: href,
    breadcrumbBlog: text,
    authorName: text,
    /** {n} is the article's read time in minutes. */
    readTime: text,
    tagsLabel: text,
    writtenBy: text,
    authorBio: text,
    searchAction: href,
    categoriesHeading: text,
    recentHeading: text,
    related: z.object({ eyebrow: text, title: text }),
    share: z.object({
      label: text,
      /** {network} is the network name. */
      aria: text,
      networks: z
        .array(
          z.object({
            label: text,
            name: text,
            /** {url} is the encoded address of the article. */
            url: text,
          })
        )
        .min(1),
    }),
  }),
})
export type BlogTemplate = z.infer<typeof blogTemplate>
