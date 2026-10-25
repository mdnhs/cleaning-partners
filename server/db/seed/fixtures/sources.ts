import "server-only"

import { type MediaView, replaceMediaRefs } from "@/lib/media"
import { PUBLIC_SETTINGS_KEYS } from "@/lib/schemas/settings"
import { PAGE_KEYS } from "@/templates/registry"
import type { SiteSources } from "@/templates/shared/sources"

import { contentFixtures } from "./index"
import { fixtureMediaKey, fixtureMediaLookup, MEDIA } from "./media"

/**
 * A fixture image served from public/. No dimensions: DB rows carry the real
 * ones, but the views pass only `url` to the components (which size their
 * images themselves), so neither source renders differently.
 */
function staticMedia(id: string): MediaView {
  const key = fixtureMediaKey(id)
  return {
    id,
    url: key,
    alt: MEDIA.find((m) => m.key === key)?.alt ?? "",
    width: null,
    height: null,
    blurDataUrl: null,
  }
}

/**
 * The public site's data built straight from the seed fixtures, without a
 * database, with every { mediaId } resolved to its static MediaView (url =
 * the /images/... path). It is the expected value for the DB-backed loader
 * (tests/integration) and the interim data source of the public pages
 * (server/modules/pages/sources.ts) until Task 9 reads the database.
 */
export function fixtureSiteSources(): SiteSources {
  const fx = contentFixtures(fixtureMediaLookup)
  const categories = fx.categories.map((c) => ({
    id: `category:${c.slug}`,
    ...c,
  }))
  const articles = fx.articles.map((a) => {
    const category = categories.find((c) => c.slug === a.categorySlug)!
    return {
      id: `article:${a.slug}`,
      slug: a.slug,
      publishedAt: a.publishedAt,
      readTimeMinutes: a.readTimeMinutes,
      seo: a.seo,
      category: { slug: category.slug, name: category.name },
      // Bylines come from users (the design shows the template's author name).
      author: null,
      content: a.content,
    }
  })
  const sources = {
    settings: Object.fromEntries(
      PUBLIC_SETTINGS_KEYS.map((key) => [key, fx.settings[key]])
    ),
    pages: Object.fromEntries(
      PAGE_KEYS.map((key) => [
        key,
        { data: fx.pages[key].data, seo: fx.pages[key].seo },
      ])
    ),
    services: fx.services.map((s, sortOrder) => ({
      id: `service:${s.slug}`,
      slug: s.slug,
      sortOrder,
      seo: s.seo,
      content: s.content,
    })),
    articles,
    categories,
    team: fx.team.map((t) => ({ id: `team:${t.name}`, ...t })),
    clients: fx.clients.map((c) => ({ id: `client:${c.name}`, ...c })),
    groupCompanies: fx.groupCompanies.map((g) => ({
      id: `group:${g.name}`,
      ...g,
    })),
    testimonials: fx.testimonials.map((t) => ({
      id: `testimonial:${t.name}`,
      ...t,
    })),
  }
  return replaceMediaRefs(sources, staticMedia) as SiteSources
}
