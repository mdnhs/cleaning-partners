import { redirect } from "next/navigation"
import { Suspense } from "react"

import { websiteHref, withSearch } from "@/lib/admin/website"
import { requireActor, requirePermission } from "@/server/auth/session"

/** Legal pages moved to Website (307, query kept). */
export default function LegalPagesPage({
  searchParams,
}: PageProps<"/admin/pages/legal">) {
  return (
    <Suspense fallback={null}>
      <Go searchParams={searchParams} />
    </Suspense>
  )
}

async function Go({
  searchParams,
}: Pick<PageProps<"/admin/pages/legal">, "searchParams">): Promise<never> {
  await requireActor()
  await requirePermission({ page: ["read"] })
  redirect(withSearch(websiteHref("legal"), await searchParams))
}
