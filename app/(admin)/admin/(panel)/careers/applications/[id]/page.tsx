import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ApplicationDetail } from "@/components/admin/careers/application-detail"
import { isUuid } from "@/lib/ids"
import { requirePage } from "@/server/auth/session"

export const metadata: Metadata = { title: "Application" }

export default function ApplicationPage({
  params,
}: PageProps<"/admin/careers/applications/[id]">) {
  return (
    <Suspense fallback={null}>
      <Screen params={params} />
    </Suspense>
  )
}

async function Screen({
  params,
}: Pick<PageProps<"/admin/careers/applications/[id]">, "params">) {
  // Permission first: a 403 never leaks whether an id exists.
  await requirePage("/admin/careers/applications")
  const { id } = await params
  if (!isUuid(id)) notFound()
  return <ApplicationDetail id={id.toLowerCase()} />
}
