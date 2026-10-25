import type { Metadata } from "next"
import { unstable_rethrow } from "next/navigation"
import { connection } from "next/server"

import "../globals.css"
import { barlow, fontMono, roboto } from "@/app/fonts"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { publicOrigin } from "@/server/lib/site-origin"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { DEFAULT_FAVICON, siteMetadata } from "@/templates/shared/page-meta"

/**
 * Site-wide metadata (metadataBase, default title and description, which the
 * 404 page inherits). Never fails the page: with the data source down the
 * page's own boundary reports it, so this returns nothing instead of throwing.
 */
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  try {
    const s = await loadSiteSources()
    return siteMetadata(s, publicOrigin(s.settings.site.productionUrl))
  } catch (error) {
    unstable_rethrow(error)
    return { icons: { icon: DEFAULT_FAVICON } }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Each page's title and description come from its generateMetadata.
  // lang is part of the static shell; SiteLocale applies settings.site.locale.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        roboto.variable,
        barlow.variable
      )}
    >
      <body>
        <noscript>
          <style>{`[data-intro]{visibility:visible!important}`}</style>
        </noscript>
        <SmoothScroll />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
