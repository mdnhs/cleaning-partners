import type { Metadata } from "next"
import { connection } from "next/server"

import "./admin.css"
import { adminMono as fontMono, jakarta } from "@/app/fonts"
import { AdminThemeProvider } from "@/components/admin/theme-provider"
import { cn } from "@/lib/utils"
import { loadAdminFavicon } from "@/server/lib/admin-brand"

export async function generateMetadata(): Promise<Metadata> {
  // The site's favicon (settings), else the bundled public/favicon.ico: the
  // tab matches the public site's. Read at request time, like the site layout.
  await connection()
  return {
    title: {
      default: "Admin · Cleaning Partners",
      template: "%s · Cleaning Partners admin",
    },
    robots: { index: false, follow: false },
    icons: { icon: (await loadAdminFavicon()) ?? "/favicon.ico" },
  }
}

/**
 * Root layout for /admin (separate from the public site's). admin.css is
 * the admin's own Tailwind entry (it does not import the public
 * globals.css); its tokens are all under html[data-admin].
 */
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IE"
      data-admin=""
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        jakarta.variable
      )}
    >
      <body className="min-h-svh bg-background text-foreground">
        {/* The published theme is applied per segment (AdminThemed), in the
            same Suspense boundary as the content it styles. */}
        <AdminThemeProvider>{children}</AdminThemeProvider>
      </body>
    </html>
  )
}
