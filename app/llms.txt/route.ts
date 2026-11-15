import { connection } from "next/server"

import { listLegalLinks } from "@/server/modules/builder-pages/queries"
import { loadSiteSources } from "@/server/modules/pages/sources"
import { getSiteOrigin } from "@/server/modules/seo/queries"
import { siteLlms } from "@/templates/shared/llms"

// GET /llms.txt: the site as Markdown for AI assistants (llmstxt.org).
// 404 while it is switched off in SEO defaults, and while the whole site is
// hidden from search: AI tools stay out the way crawlers do.
export async function GET() {
  await connection()
  const [sources, origin, legal] = await Promise.all([
    loadSiteSources(),
    getSiteOrigin(),
    listLegalLinks(),
  ])
  const defaults = sources.settings["seo.defaults"]
  if (!defaults.llms.enabled || defaults.robots === "noindex")
    return new Response("Not found", { status: 404 })
  return new Response(siteLlms(sources, origin, legal), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    },
  })
}
