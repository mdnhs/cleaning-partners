import type { Metadata } from "next"
import { Suspense } from "react"

import { LegalPagesScreen } from "@/components/admin/legal/legal-pages-screen"
import { PageHeader } from "@/components/admin/page-header"
import { requirePage } from "@/server/auth/session"

export const metadata: Metadata = { title: "Legal pages" }

export default function LegalPagesPage() {
  return (
    <Suspense fallback={null}>
      <LegalPages />
    </Suspense>
  )
}

async function LegalPages() {
  await requirePage("/admin/pages/legal")
  return (
    <>
      <PageHeader
        title="Legal pages"
        description="Privacy, terms, cookies and other policies. Published pages are linked in the footer."
      />
      <LegalPagesScreen />
    </>
  )
}
