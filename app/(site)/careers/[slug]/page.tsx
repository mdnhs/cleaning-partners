import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { SLUG_PATTERN } from "@/lib/schemas/common"
import { jobPostingJsonLd } from "@/lib/seo/job-posting"
import { publicOrigin } from "@/server/lib/site-origin"
import {
  getJob,
  listPublishedJobs,
} from "@/server/modules/job-postings/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { JobDetailTemplate } from "@/templates/careers/render"
import { jobDetailView } from "@/templates/careers/view"
import { jobMetadata } from "@/templates/shared/page-meta"

// One job posting. proxy.ts answers unknown and draft addresses with a real
// 404 (DETAIL "careers"); notFound() below is the backstop and the
// previewer's path for an address that does not exist.

async function jobFor(slug: string) {
  return SLUG_PATTERN.test(slug) ? getJob(slug) : null
}

export async function generateMetadata({
  params,
}: PageProps<"/careers/[slug]">): Promise<Metadata> {
  await connection()
  const job = await jobFor((await params).slug)
  if (!job) return {}
  return jobMetadata(await loadSiteSources(), job)
}

export default function JobPage({ params }: PageProps<"/careers/[slug]">) {
  return (
    <SiteThemed>
      <Content params={params} />
    </SiteThemed>
  )
}

async function Content({
  params,
}: Pick<PageProps<"/careers/[slug]">, "params">) {
  await connection()
  const { slug } = await params
  const [sources, job, all] = await Promise.all([
    loadSiteSources(),
    jobFor(slug),
    listPublishedJobs(),
  ])
  if (!job) notFound()
  const now = new Date()
  const view = jobDetailView(sources, job, all, now)
  const origin = publicOrigin(sources.settings.site.productionUrl)
  const jsonLd = view.open
    ? jobPostingJsonLd(job, origin, {
        name: sources.settings.site.name,
        url: origin,
      })
    : null
  return <JobDetailTemplate view={view} jsonLd={jsonLd} />
}
