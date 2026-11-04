import "server-only"

import { unstable_rethrow } from "next/navigation"

import { PUBLIC_SETTINGS_KEYS } from "@/lib/schemas/settings"
import { AppError } from "@/server/lib/errors"
import { listArticles } from "@/server/modules/articles/queries"
import { listLegalLinks } from "@/server/modules/builder-pages/queries"
import {
  listCategories,
  listClients,
  listGroupCompanies,
  listTeam,
  listTestimonials,
} from "@/server/modules/collections/queries"
import { resolveMedia } from "@/server/modules/media/queries"
import { getPage } from "@/server/modules/pages/queries"
import { listServices } from "@/server/modules/services/queries"
import { assertPreviewAccess } from "@/server/modules/preview/guard"
import { getSettings } from "@/server/modules/settings/queries"
import { PAGE_KEYS } from "@/templates/registry"
import {
  CHROME_SETTINGS_KEYS,
  type ChromeSources,
  type SiteSources,
} from "@/templates/shared/sources"

function required<T>(value: T | null, what: string): T {
  if (value === null)
    throw new AppError(
      "INTERNAL",
      `Missing published content: ${what}. Run pnpm db:seed.`
    )
  return value
}

/**
 * Everything the public templates render, from the cached queries ('use
 * cache' + tags), with media resolved to URLs. Call only after
 * `await connection()` inside <Suspense> (no database at build time).
 */
export async function loadSiteSources(): Promise<SiteSources> {
  // Draft mode without a valid preview cookie + session → exit preview.
  await assertPreviewAccess()
  const [
    settingsValues,
    pageRecords,
    services,
    articles,
    categories,
    team,
    clients,
    groupCompanies,
    testimonials,
  ] = await Promise.all([
    Promise.all(PUBLIC_SETTINGS_KEYS.map((key) => getSettings(key))),
    Promise.all(PAGE_KEYS.map((key) => getPage(key))),
    listServices(),
    listArticles(),
    listCategories(),
    listTeam(),
    listClients(),
    listGroupCompanies(),
    listTestimonials(),
  ])
  const settings = Object.fromEntries(
    PUBLIC_SETTINGS_KEYS.map((key, i) => [
      key,
      required(settingsValues[i], `settings.${key}`),
    ])
  )
  const pages = Object.fromEntries(
    PAGE_KEYS.map((key, i) => {
      const page = required(pageRecords[i], `page ${key}`)
      return [key, { data: page.data, seo: page.seo }]
    })
  )
  return (await resolveMedia({
    settings,
    pages,
    services,
    articles,
    categories,
    team,
    clients,
    groupCompanies,
    testimonials,
  })) as SiteSources
}

/**
 * Just what the navbar and footer render (see ChromeSources): the layout
 * shows them on every page, so it must not load every page's content too.
 * Same cached readers and the same preview check as loadSiteSources; call
 * only after `await connection()` inside <Suspense>.
 */
export async function loadChromeSources(): Promise<ChromeSources> {
  await assertPreviewAccess()
  const [settingsValues, services, groupCompanies, legalLinks] =
    await Promise.all([
      Promise.all(CHROME_SETTINGS_KEYS.map((key) => getSettings(key))),
      listServices(),
      listGroupCompanies(),
      // The footer works without them: a failed read is logged and shows no
      // legal pages (the cached reader never stores a failure as "none").
      listLegalLinks().catch((error: unknown) => {
        unstable_rethrow(error)
        console.error("[site chrome] legal links unavailable")
        return []
      }),
    ])
  const settings = Object.fromEntries(
    CHROME_SETTINGS_KEYS.map((key, i) => [
      key,
      required(settingsValues[i], `settings.${key}`),
    ])
  )
  return {
    ...((await resolveMedia({
      settings,
      services,
      groupCompanies,
    })) as Omit<ChromeSources, "legalLinks">),
    legalLinks,
  }
}
