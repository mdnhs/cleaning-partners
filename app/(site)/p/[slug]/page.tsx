import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { getBuilderPageForRequest } from "@/server/modules/builder-pages/queries"
import { resolveMedia } from "@/server/modules/media/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { BuilderTemplate } from "@/templates/builder/render"
import { builderView } from "@/templates/builder/views"
import { builderPageMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const page = await getBuilderPageForRequest(slug)
  if (!page) return {}
  return builderPageMetadata(await loadSiteSources(), await resolveMedia(page))
}

export default function BuilderPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({ params }: Pick<PageProps<"/p/[slug]">, "params">) {
  await connection()
  const { slug } = await params
  const sources = await loadSiteSources()
  const page = await getBuilderPageForRequest(slug)
  // proxy.ts returns a real 404 for unknown slugs; this branch is the
  // backstop (and the previewer's path for a slug that does not exist).
  if (!page) notFound()
  const { blocks } = await resolveMedia(page)
  return <BuilderTemplate view={builderView(sources, blocks)} />
}
