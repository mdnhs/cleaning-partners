import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { HelpArticleView } from "@/components/admin/help/help-view"
import { HelpArticleSkeleton } from "@/components/admin/help/skeletons"
import {
  canReadArticle,
  HELP_ARTICLES,
  helpArticle,
} from "@/lib/admin/help/registry"
import { requirePage } from "@/server/auth/session"

// The docs are static data in the repo, so every article is known up front.
export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/admin/help/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const article = helpArticle(slug)
  return { title: article ? `${article.title} · Help` : "Help" }
}

export default function HelpArticlePage({
  params,
}: PageProps<"/admin/help/[slug]">) {
  return (
    <Suspense fallback={<HelpArticleSkeleton />}>
      <Gate params={params} />
    </Suspense>
  )
}

async function Gate({
  params,
}: {
  params: PageProps<"/admin/help/[slug]">["params"]
}) {
  const { slug } = await params
  // Signed in before the 404, so a stranger never learns which paths exist.
  const actor = await requirePage("/admin/help")
  const article = helpArticle(slug)
  if (!article) notFound()
  // An article about screens the viewer's role cannot open is not listed,
  // and not served either.
  if (!canReadArticle(actor.roles, article)) notFound()
  return <HelpArticleView article={article} roles={actor.roles} />
}
