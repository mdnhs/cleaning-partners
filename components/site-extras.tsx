import { unstable_rethrow } from "next/navigation"
import { connection } from "next/server"

import { JsonLd } from "@/components/seo/json-ld"
import { publicOrigin } from "@/server/lib/site-origin"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { siteJsonLd } from "@/templates/shared/structured-data"

/**
 * Site-wide additions, rendered inside <Suspense> in the root layout: the
 * business JSON-LD (a non-rendering script). Without site sources nothing
 * renders, so a database outage still reaches the page's own error boundary
 * instead of breaking the layout.
 */
export async function SiteExtras() {
  await connection()
  let s: Awaited<ReturnType<typeof loadSiteSources>>
  try {
    s = await loadSiteSources()
  } catch (error) {
    unstable_rethrow(error)
    return null
  }
  return (
    <JsonLd data={siteJsonLd(s, publicOrigin(s.settings.site.productionUrl))} />
  )
}
