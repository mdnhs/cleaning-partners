import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ArticleEditor } from "@/components/admin/articles/article-editor"
import { isUuid } from "@/lib/ids"
import { requirePage } from "@/server/auth/session"
import { getSiteOrigin } from "@/server/modules/seo/queries"

export const metadata: Metadata = { title: "Edit article" }

export default function EditArticlePage({
  params,
}: PageProps<"/admin/blog/[id]">) {
  return (
    <Suspense fallback={null}>
      <Screen params={params} />
    </Suspense>
  )
}

async function Screen({
  params,
}: Pick<PageProps<"/admin/blog/[id]">, "params">) {
  const { id } = await params
  // Permission first, as on every [param] page but settings/[key].
  await requirePage("/admin/blog")
  if (!isUuid(id)) notFound()
  return <ArticleEditor id={id} origin={await getSiteOrigin()} />
}
