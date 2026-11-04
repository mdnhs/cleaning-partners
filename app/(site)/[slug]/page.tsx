import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { getLegalPageForRequest } from "@/server/modules/builder-pages/queries"
import { resolveMedia } from "@/server/modules/media/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { BuilderTemplate } from "@/templates/builder/render"
import { builderView } from "@/templates/builder/views"
import { builderPageMetadata } from "@/templates/shared/page-meta"

// Legal pages (Privacy, Terms, Cookies …): builder pages with a legal order,
// served at the site root. The site's own routes (about, blog, …) are static
// segments and win over this one; an unknown or unpublished address gets a
// real 404 from proxy.ts, and notFound() below is the backstop (and the
// previewer's path for an address that does not exist).

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const page = await getLegalPageForRequest(slug)
  if (!page) return {}
  return builderPageMetadata(await loadSiteSources(), await resolveMedia(page))
}

export default function LegalPage({ params }: PageProps<"/[slug]">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({ params }: Pick<PageProps<"/[slug]">, "params">) {
  await connection()
  const { slug } = await params
  const sources = await loadSiteSources()
  const page = await getLegalPageForRequest(slug)
  if (!page) notFound()
  const { blocks } = await resolveMedia(page)
  return <BuilderTemplate view={builderView(sources, blocks)} />
}
