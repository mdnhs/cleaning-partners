import { connection } from "next/server"
import { Suspense } from "react"

import { BrandMark } from "@/components/admin/shell/brand-mark"
import { loadAdminBrand } from "@/server/lib/admin-brand"

/**
 * The auth pages' brand: the published logo, read at request time inside
 * Suspense (the layout stays static); the CP chip until it arrives or when
 * none is set.
 */
export function AuthBrandMark({
  tone,
  className,
}: {
  tone?: "default" | "inverse"
  className?: string
}) {
  return (
    <Suspense fallback={<BrandMark tone={tone} className={className} />}>
      <PublishedBrandMark tone={tone} className={className} />
    </Suspense>
  )
}

async function PublishedBrandMark({
  tone,
  className,
}: {
  tone?: "default" | "inverse"
  className?: string
}) {
  // Request time, not prerender: the build has no database.
  await connection()
  const brand = await loadAdminBrand()
  return <BrandMark tone={tone} brand={brand} className={className} />
}
