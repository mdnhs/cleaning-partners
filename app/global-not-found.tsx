import type { Metadata } from "next"

import "./globals.css"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { NotFoundContent } from "@/components/not-found-content"
import { SiteFooterSlot, SiteHeaderSlot } from "@/components/site-chrome"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { barlow, fontMono, roboto } from "@/app/fonts"

// Static: the docs only cover a plain `metadata` export here. Same title and
// description as the seeded seo.defaults; noindex is added by Next.
export const metadata: Metadata = {
  title: "Cleaning Partners Ltd. | The Clean Team",
  description:
    "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
}

// Next 16 global 404: unmatched URLs (and the proxy's rewrite of unknown
// posts, services, jobs and pages) bypass every layout, so this reproduces
// the (site) layout's shell: navbar, the 404 copy from
// settings.microcopy.notFound, footer. Each part reads settings on its own and
// degrades on its own when the database is down (chrome hides, copy falls
// back to fixed text).
//
// SiteExtras (consent banner, tracking) and AttributionCapture are left out
// on purpose: a missing page is not a landing page to measure, and no
// visitor consents or is attributed from here.
export default function GlobalNotFound() {
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
      <body className="bg-white text-ink">
        <noscript>
          <style>{`[data-intro]{visibility:visible!important}`}</style>
        </noscript>
        <SmoothScroll />
        <ThemeProvider>
          <SiteHeaderSlot />
          <div className="min-h-svh">
            <NotFoundContent />
          </div>
          <SiteFooterSlot />
        </ThemeProvider>
      </body>
    </html>
  )
}
