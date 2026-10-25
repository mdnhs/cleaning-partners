import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ServiceDetailTemplate } from "@/templates/services/render"
import { serviceDetailView } from "@/templates/services/view"
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
  const view = serviceDetailView(await loadSiteSources(), slug)
  // Unknown slugs: a soft 404 (the status can't change once the shell has
  // streamed), noindex'ed by Next.
  if (!view) notFound()
  return <ServiceDetailTemplate view={view} />
}
