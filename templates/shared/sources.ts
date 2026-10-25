import type { WithMedia } from "@/lib/media"
import type { Seo } from "@/lib/schemas/common"
import type { PublicSettingsKey, SettingsValue } from "@/lib/schemas/settings"
import type { ArticleRecord } from "@/server/modules/articles/queries"
import type {
  CategoryRecord,
  ClientRecord,
  GroupCompanyRecord,
  TeamMemberRecord,
  TestimonialRecord,
} from "@/server/modules/collections/queries"
import type { ServiceRecord } from "@/server/modules/services/queries"
import type { PageData, PageKey } from "@/templates/registry"

/**
 * Everything the public templates render, with media resolved to URLs.
 * Loaded per request by server/modules/pages/sources.ts (cached queries,
 * from Task 9; the seed fixtures until then); the view builders in
 * templates/* are pure functions of it.
 */
export type SiteSources = {
  settings: { [K in PublicSettingsKey]: WithMedia<SettingsValue<K>> }
  pages: {
    [K in PageKey]: { data: WithMedia<PageData<K>>; seo: WithMedia<Seo> }
  }
  /** Published services in display order. */
  services: WithMedia<ServiceRecord>[]
  /** Published articles, newest first. */
  articles: WithMedia<ArticleRecord>[]
  categories: CategoryRecord[]
  team: WithMedia<TeamMemberRecord>[]
  clients: WithMedia<ClientRecord>[]
  groupCompanies: WithMedia<GroupCompanyRecord>[]
  testimonials: TestimonialRecord[]
}

export type SiteArticle = SiteSources["articles"][number]
export type SiteService = SiteSources["services"][number]
