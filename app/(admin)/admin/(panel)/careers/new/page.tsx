import type { Metadata } from "next"
import { Suspense } from "react"

import { NewJobForm } from "@/components/admin/careers/new-job-form"
import { requirePage, requirePermission } from "@/server/auth/session"

export const metadata: Metadata = { title: "New job" }

export default function NewJobPage() {
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  )
}

async function Screen() {
  await requirePage("/admin/careers/new")
  // The registry lists job:read for /admin/careers/*; creating needs more.
  await requirePermission({ job: ["create"] })
  return <NewJobForm />
}
