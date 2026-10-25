import { cookies } from "next/headers"
import { Suspense } from "react"

import { AdminShell } from "@/components/admin/shell/admin-shell"
import { SIDEBAR_COOKIE } from "@/components/admin/shell/constants"
import { AdminShellSkeleton } from "@/components/admin/shell/shell-skeleton"
import { AdminThemed } from "@/components/admin/theme/admin-themed"
import { requireSession } from "@/server/auth/session"
import { getEnv } from "@/server/env"
import { loadAdminBrand } from "@/server/lib/admin-brand"
import { getSiteEnv } from "@/server/lib/site-env"
import { getSettings } from "@/server/modules/settings/queries"

/**
 * Signed-in admin frame (spec §8). The session is read fresh inside
 * Suspense (Cache Components: request data never in the static shell).
 */
export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The theme gates the skeleton too: it never paints in default tokens
  // when a non-default theme is published.
  return (
    <AdminThemed>
      <Suspense fallback={<AdminShellSkeleton />}>
        <PanelFrame>{children}</PanelFrame>
      </Suspense>
    </AdminThemed>
  )
}

async function PanelFrame({ children }: { children: React.ReactNode }) {
  // Session first: it reads the request, so nothing below (the settings
  // query needs the database) runs while the route is being prerendered.
  const { user, actor, session } = await requireSession()
  // A settings failure fails the frame, into app/(admin)/admin/error.tsx.
  const [cookieStore, site, brand] = await Promise.all([
    cookies(),
    getSettings("site"),
    // The published logo for the sidebar; degrades to the CP chip.
    loadAdminBrand(),
  ])
  const productionUrl = site?.productionUrl ?? undefined
  return (
    <AdminShell
      // Set by the sidebar toggle (components/ui/sidebar.tsx).
      defaultSidebarOpen={cookieStore.get(SIDEBAR_COOKIE)?.value !== "false"}
      brand={brand}
      site={{
        // The configured public origin; this deployment's own until set.
        url: productionUrl ?? new URL(getEnv().BETTER_AUTH_URL).origin,
        env: getSiteEnv(productionUrl),
      }}
      session={{
        user,
        roles: actor.roles,
        impersonatedBy: session.impersonatedBy,
      }}
    >
      {children}
    </AdminShell>
  )
}
