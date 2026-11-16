import { Suspense } from "react"

import { SiteThemeStyle } from "@/components/site-theme-style"

/**
 * A public page's request-time content and the published brand overrides
 * in one Suspense boundary: the content never paints before the theme. The
 * default theme emits no style, so the markup is the content alone.
 *
 * `fallback` is the page's loading skeleton (none by default).
 *
 * Per page, not around the layout's {children}: a layout-level boundary
 * would make every notFound() a streamed soft 404 for the whole site.
 */
export function SiteThemed({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  /** Shown while the content loads (a client navigation paints it at once). */
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback}>
      <SiteThemeStyle />
      {children}
    </Suspense>
  )
}
