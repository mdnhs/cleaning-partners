import type { Metadata } from "next"
import { Suspense } from "react"

import { PageHeader } from "@/components/admin/page-header"
import { CustomPagesScreen } from "@/components/admin/website/custom-pages-screen"
import { requirePage } from "@/server/auth/session"

export const metadata: Metadata = { title: "Custom pages" }

export default function CustomPagesPage() {
  return (
    <Suspense fallback={null}>
      <CustomPages />
    </Suspense>
  )
}

async function CustomPages() {
  await requirePage("/admin/website/custom-pages")
  return (
    <>
      <PageHeader
        title="Custom pages"
        description="Pages built from the site's sections, each at its own address. Changes stay in a draft until you publish."
      />
      <CustomPagesScreen />
    </>
  )
}
