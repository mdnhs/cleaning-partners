import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { JsonLd } from "@/components/seo/json-ld"
import { SiteThemed } from "@/components/site-themed"
import { publicOrigin } from "@/server/lib/site-origin"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ServiceDetailTemplate } from "@/templates/services/render"
import { serviceDetailView } from "@/templates/services/view"
import { serviceJsonLd } from "@/templates/shared/structured-data"
import { serviceMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  await connection()
  const { slug } = await params
  return serviceMetadata(await loadSiteSources(), slug)
}

export default function ServicePage({ params }: PageProps<"/services/[slug]">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({
  params,
}: Pick<PageProps<"/services/[slug]">, "params">) {
  await connection()
  const { slug } = await params
  const sources = await loadSiteSources()
  const view = serviceDetailView(sources, slug)
  // proxy.ts returns a real 404 for unknown slugs; this branch only runs in
  // draft or preview, where the proxy lets the request through.
  if (!view) notFound()
  const nodes = serviceJsonLd(
    sources,
    slug,
    publicOrigin(sources.settings.site.productionUrl)
  )
  return (
    <>
      <ServiceDetailTemplate view={view} />
      {nodes && <JsonLd data={nodes} />}
    </>
  )
}
