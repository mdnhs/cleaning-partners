import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { websiteHref, withSearch } from "@/lib/admin/website"
import { requireActor, requirePermission } from "@/server/auth/session"
import { isPageKey } from "@/templates/registry"

/** Each page is edited on its Website screen (307, query kept). */
export default function PageKeyPage({
  params,
  searchParams,
}: PageProps<"/admin/pages/[key]">) {
  return (
    <Suspense fallback={null}>
      <Go params={params} searchParams={searchParams} />
    </Suspense>
  )
}

// Signed in before the 404, so a stranger never learns which paths exist.
async function Go({
  params,
  searchParams,
}: Pick<
  PageProps<"/admin/pages/[key]">,
  "params" | "searchParams"
>): Promise<never> {
  const { key } = await params
  await requireActor()
  if (!isPageKey(key)) notFound()
  await requirePermission({ page: ["read"] })
  redirect(withSearch(websiteHref(key), await searchParams))
}
