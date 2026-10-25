import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ArticleTemplate } from "@/templates/blog/render"
import { articleView } from "@/templates/blog/view"
import { articleMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  await connection()
  const { slug } = await params
  return articleMetadata(await loadSiteSources(), slug)
}

export default function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  await connection()
  const { slug } = await params
  const view = articleView(await loadSiteSources(), slug)
  // Unknown slugs: a soft 404 (the status can't change once the shell has
  // streamed), noindex'ed by Next.
  if (!view) notFound()
  return <ArticleTemplate view={view} />
}
