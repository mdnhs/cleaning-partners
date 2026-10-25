import Link from "next/link"
import { Suspense } from "react"

import { SignOutControl } from "@/components/admin/auth/sign-out-control"
import { AdminThemed } from "@/components/admin/theme/admin-themed"
import { requireSession } from "@/server/auth/session"

/**
 * Minimal signed-in frame until the Phase 4 shell replaces it (sidebar, ⌘K,
 * impersonation banner). The session is read fresh inside Suspense (Cache
 * Components: request data never in the static shell).
 */
export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminThemed>
      <Suspense fallback={null}>
        <PanelFrame>{children}</PanelFrame>
      </Suspense>
    </AdminThemed>
  )
}

async function PanelFrame({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession()
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4">
          <Link href="/admin" className="font-bold text-primary">
            Cleaning Partners
          </Link>
          <nav aria-label="Admin" className="flex items-center gap-4 text-sm">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
            </span>
            <SignOutControl />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  )
}
