import { redirect } from "next/navigation"
import { Suspense } from "react"

import { withSearch } from "@/lib/admin/website"
import { requireActor } from "@/server/auth/session"

/** The Pages list moved to Website (307, query kept). */
export default function PagesPage({ searchParams }: PageProps<"/admin/pages">) {
  return (
    <Suspense fallback={null}>
      <Go searchParams={searchParams} />
    </Suspense>
  )
}

async function Go({
  searchParams,
}: Pick<PageProps<"/admin/pages">, "searchParams">): Promise<never> {
  await requireActor()
  redirect(withSearch("/admin/website", await searchParams))
}
