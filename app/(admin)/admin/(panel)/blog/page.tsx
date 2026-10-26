import type { Metadata } from "next"
import { Suspense } from "react"

import { ArticlesScreen } from "@/components/admin/articles/articles-screen"
import { requirePage } from "@/server/auth/session"

export const metadata: Metadata = { title: "Blog" }

export default function ArticlesPage() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  )
}

async function Screen() {
  await requirePage("/admin/blog")
  return <ArticlesScreen />
}
