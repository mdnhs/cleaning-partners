import "server-only"

import type { CategoryInput } from "@/lib/schemas/content/category"

/**
 * lib/blog-posts.ts blogCategories, in order (= sortOrder). All six are in
 * the blog filter bar and the article sidebar.
 */
export const CATEGORIES: CategoryInput[] = [
  { slug: "medical", name: "Medical", showInFilter: true },
  { slug: "commercial", name: "Commercial", showInFilter: true },
  { slug: "domestic", name: "Domestic", showInFilter: true },
  { slug: "education", name: "Education", showInFilter: true },
  { slug: "retail", name: "Retail", showInFilter: true },
  { slug: "ulv-fogging", name: "ULV Fogging", showInFilter: true },
]
