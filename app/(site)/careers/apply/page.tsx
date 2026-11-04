import type { Metadata } from "next"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { ApplyTemplate } from "@/templates/careers/render"
import { applyView } from "@/templates/careers/view"
import { applyMetadata } from "@/templates/shared/page-meta"

// The talent pool: the same form with no job ("Send Us Your CV").

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  return applyMetadata(await loadSiteSources(), null)
}

export default function TalentPoolPage() {
  return (
    <SiteThemed>
      <Content />
    </SiteThemed>
  )
}

async function Content() {
  await connection()
  return (
    <ApplyTemplate
      view={applyView(await loadSiteSources(), null, new Date())}
    />
  )
}
