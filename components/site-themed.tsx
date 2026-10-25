import { Suspense } from "react"

/**
 * A public page's request-time content in one Suspense boundary. The page
 * shell (layout, theme provider) is static and prerendered; the content
 * streams in per request, after `await connection()`.
 *
 * Per page, not around the layout's {children}: a layout-level boundary
 * would make every notFound() a streamed soft 404 for the whole site.
 * Phase 9 adds the published brand overrides (SiteThemeStyle) here, so the
 * content never paints before the theme.
 */
export function SiteThemed({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
