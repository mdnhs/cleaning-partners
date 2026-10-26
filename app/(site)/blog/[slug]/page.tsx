import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { JsonLd } from "@/components/seo/json-ld"
import { SiteThemed } from "@/components/site-themed"
import { publicOrigin } from "@/server/lib/site-origin"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ArticleTemplate } from "@/templates/blog/render"
import { articleView } from "@/templates/blog/view"
import { articleJsonLdFor } from "@/templates/shared/structured-data"
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
  const sources = await loadSiteSources()
  const view = articleView(sources, slug)
  // Unknown slugs: a soft 404 (the status can't change once the shell has
  // streamed), noindex'ed by Next.
  if (!view) notFound()
  const nodes =
    articleJsonLdFor(
      sources,
      slug,
      publicOrigin(sources.settings.site.productionUrl)
    ) ?? []
  return (
    <>
      <ArticleTemplate view={view} />
      <JsonLd data={nodes} />
    </>
  )
}
