import type { Metadata } from "next"
import { Suspense } from "react"

import { NewArticleForm } from "@/components/admin/articles/new-article-form"
import { requirePage, requirePermission } from "@/server/auth/session"

export const metadata: Metadata = { title: "New article" }

export default function NewArticlePage() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  )
}

async function Screen() {
  await requirePage("/admin/blog/new")
  // The registry lists article:read for /admin/blog/*; writing one needs more.
  await requirePermission({ article: ["create"] })
  return <NewArticleForm />
}
