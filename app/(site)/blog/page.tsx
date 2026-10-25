import type { Metadata } from "next"
import { connection } from "next/server"

import { BlogList } from "@/components/blog/blog-list"
import { SiteThemed } from "@/components/site-themed"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { BlogTemplate } from "@/templates/blog/render"
import { blogView } from "@/templates/blog/view"
import { pageMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  return pageMetadata(await loadSiteSources(), "blog")
}

// `searchParams` is runtime data: it is read inside <Suspense> (SiteThemed),
// so the page can still prerender a shell.
export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <SiteThemed>
      <Content searchParams={searchParams} />
    </SiteThemed>
  )
}

async function Content({
  searchParams,
}: Pick<PageProps<"/blog">, "searchParams">) {
  await connection()
  const [{ category, q }, sources] = await Promise.all([
    searchParams,
    loadSiteSources(),
  ])
  const view = blogView(sources)
  const initialCategory = typeof category === "string" ? category : undefined
  const initialQuery = typeof q === "string" ? q : undefined
  return (
    <BlogTemplate
      view={view}
      posts={
        <BlogList
          {...view.posts}
          // Remount when arriving from a sidebar category or search link
          key={`${initialCategory}|${initialQuery}`}
          initialCategory={initialCategory}
          initialQuery={initialQuery}
        />
      }
    />
  )
}
