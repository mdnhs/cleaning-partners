import "server-only"

import { articlesFixture } from "./articles"
import { CATEGORIES } from "./categories"
import { clientsFixture } from "./clients"
import { groupCompaniesFixture } from "./group-companies"
import type { MediaLookup } from "./media"
import { pagesFixture } from "./pages"
import { servicesFixture } from "./services"
import { settingsFixture } from "./settings"
import { teamFixture } from "./team"
import { testimonialsFixture } from "./testimonials"

/** Every seed fixture, with media references resolved through `media`. */
export function contentFixtures(media: MediaLookup) {
  return {
    settings: settingsFixture(media),
    pages: pagesFixture(media),
    services: servicesFixture(media),
    categories: CATEGORIES,
    articles: articlesFixture(media),
    team: teamFixture(media),
    clients: clientsFixture(media),
    groupCompanies: groupCompaniesFixture(media),
    testimonials: testimonialsFixture(),
  }
}

export type ContentFixtures = ReturnType<typeof contentFixtures>
