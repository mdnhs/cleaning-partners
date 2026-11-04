import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { SLUG_PATTERN } from "@/lib/schemas/common"
import { getJob } from "@/server/modules/job-postings/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ApplyTemplate } from "@/templates/careers/render"
import { applyView } from "@/templates/careers/view"
import { applyMetadata } from "@/templates/shared/page-meta"

// The application form for one job. A closed job shows the closed notice
// instead of the form; an unknown or draft job is a 404.

async function jobFor(slug: string) {
  return SLUG_PATTERN.test(slug) ? getJob(slug) : null
}

export async function generateMetadata({
  params,
}: PageProps<"/careers/[slug]/apply">): Promise<Metadata> {
  await connection()
  const job = await jobFor((await params).slug)
  if (!job) return {}
  return applyMetadata(await loadSiteSources(), job)
}

export default function ApplyPage({
  params,
}: PageProps<"/careers/[slug]/apply">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({
  params,
}: Pick<PageProps<"/careers/[slug]/apply">, "params">) {
  await connection()
  const { slug } = await params
  const [sources, job] = await Promise.all([loadSiteSources(), jobFor(slug)])
  if (!job) notFound()
  return <ApplyTemplate view={applyView(sources, job, new Date())} />
}
