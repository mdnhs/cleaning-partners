import { unstable_rethrow } from "next/navigation"
import { connection } from "next/server"

import { NotFoundView } from "@/components/not-found-view"
import { SiteThemed } from "@/components/site-themed"
import { loadNotFoundSources } from "@/server/modules/pages/sources"
import {
  NOT_FOUND_FALLBACK,
  notFoundView,
  type NotFoundViewProps,
} from "@/templates/shared/views"

/**
 * The 404 copy from settings.microcopy.notFound, read at request time. With
 * the database down it falls back to fixed copy, so a missing page still
 * answers with a readable 404 instead of an error.
 */
async function notFoundProps(): Promise<NotFoundViewProps> {
  await connection()
  try {
    return notFoundView(await loadNotFoundSources())
  } catch (error) {
    unstable_rethrow(error)
    console.error("[not found] settings unavailable, using fixed copy", error)
    return NOT_FOUND_FALLBACK
  }
}

async function Content() {
  return <NotFoundView {...await notFoundProps()} />
}

/** The 404 body in its own themed Suspense boundary (see SiteThemed). */
export function NotFoundContent() {
  return (
    <SiteThemed>
      <Content />
    </SiteThemed>
  )
}
