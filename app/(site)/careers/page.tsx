import type { Metadata } from "next"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { listPublishedJobs } from "@/server/modules/job-postings/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { CareersTemplate } from "@/templates/careers/render"
import { careersView } from "@/templates/careers/view"
import { pageMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  return pageMetadata(await loadSiteSources(), "careers")
}

export default function CareersPage() {
  return (
    <SiteThemed>
      <Content />
    </SiteThemed>
  )
}

async function Content() {
  await connection()
  const [sources, jobs] = await Promise.all([
    loadSiteSources(),
    listPublishedJobs(),
  ])
  return <CareersTemplate view={careersView(sources, jobs, new Date())} />
}
