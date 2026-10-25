import type { Metadata } from "next"
import { connection } from "next/server"

import { SiteThemed } from "@/components/site-themed"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { HomeTemplate } from "@/templates/home/render"
import { homeView } from "@/templates/home/view"
import { pageMetadata } from "@/templates/shared/page-meta"

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  return pageMetadata(await loadSiteSources(), "home")
}

export default function HomePage() {
  return (
    <SiteThemed>
      <Content />
    </SiteThemed>
  )
}

async function Content() {
  await connection()
  return <HomeTemplate view={homeView(await loadSiteSources())} />
}
