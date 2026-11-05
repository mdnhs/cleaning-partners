import "server-only"

import { and, count, eq, inArray } from "drizzle-orm"

import { DraftDocument } from "@/blocks/document"
import { seo } from "@/lib/schemas/common"
import { articleContent } from "@/lib/schemas/content/article"
import { jobContent } from "@/lib/schemas/content/job"
import { categorySchema } from "@/lib/schemas/content/category"
import { clientSchema } from "@/lib/schemas/content/client"
import { groupCompanySchema } from "@/lib/schemas/content/group-company"
import { serviceContent } from "@/lib/schemas/content/service"
import { teamMemberSchema } from "@/lib/schemas/content/team-member"
import { testimonialSchema } from "@/lib/schemas/content/testimonial"
import { SETTINGS_KEYS, settingsSchemas } from "@/lib/schemas/settings"
import type { Db } from "@/server/db/client"
import {
  articleCategories,
  articles,
  builderPages,
  clients,
  jobPostings,
  groupCompanies,
  media,
  pages,
  services,
  settings,
  teamMembers,
  testimonials,
} from "@/server/db/schema"
import { backfillMediaUsages } from "@/server/lib/media-usages"
import { PAGE_KEYS, PAGES, templateSchemaFor } from "@/templates/registry"

import { contentFixtures } from "./fixtures"
import {
  fixtureMediaKey,
  fixtureMediaLookup,
  MEDIA,
  type MediaKey,
  type MediaLookup,
} from "./fixtures/media"
import { readStaticMedia } from "./media"

export const SEED_TABLES = [
  "media",
  "articleCategories",
  "settings",
  "pages",
  "legalPages",
  "jobPostings",
  "services",
  "articles",
  "teamMembers",
  "clients",
  "groupCompanies",
  "testimonials",
] as const
export type SeedReport = Record<(typeof SEED_TABLES)[number], number>

export type FixedRowsReport = { media: number; settings: number; pages: number }

export type SeedIfEmptyResult =
  | { seeded: true; report: SeedReport }
  | { seeded: false; pages: number; filled: FixedRowsReport }

/**
 * Container auto-seed (docker-entrypoint.sh, spec §1.2 #6): seeds a
 * database whose `pages` table has no rows at all, i.e. a fresh deploy.
 * Any page row (published, draft or scheduled) means the site has content:
 * only the fixed rows a release needs are added (seedFixedRows), so deleted
 * services or articles are never re-created and unpublishing every page
 * does not trigger a re-seed.
 */
export async function seedIfEmpty(
  db: Db,
  options: { publicDir?: string } = {}
): Promise<SeedIfEmptyResult> {
  const [{ n }] = await db.select({ n: count() }).from(pages)
  if (n > 0)
    return { seeded: false, pages: n, filled: await seedFixedRows(db, options) }
  return { seeded: true, report: await seedContent(db, options) }
}

const FIXTURE_ID = /00000000-0000-7000-8000-\d{12}/g

/**
 * The rows the code needs and an admin cannot delete: one per fixed page
 * key and per settings key. Every public page loads the fixed pages, so a
 * release that adds one (careers) must not wait for a manual db:seed. Missing
 * ones are inserted from the fixtures, with only the static media rows they
 * reference; existing rows are never touched.
 */
export async function seedFixedRows(
  db: Db,
  options: { publicDir?: string } = {}
): Promise<FixedRowsReport> {
  const [pageRows, settingRows] = await Promise.all([
    db.select({ key: pages.key }).from(pages),
    db.select({ key: settings.key }).from(settings),
  ])
  const havePages = new Set<string>(pageRows.map((r) => r.key))
  const haveSettings = new Set<string>(settingRows.map((r) => r.key))
  const pageKeys = PAGE_KEYS.filter((k) => !havePages.has(k))
  const settingKeys = SETTINGS_KEYS.filter((k) => !haveSettings.has(k))
  if (pageKeys.length === 0 && settingKeys.length === 0)
    return { media: 0, settings: 0, pages: 0 }

  // Which static media the missing rows reference: fixture ids are
  // deterministic, so a first pass with them names the keys.
  const draft = contentFixtures(fixtureMediaLookup)
  const referenced = JSON.stringify([
    pageKeys.map((k) => draft.pages[k]),
    settingKeys.map((k) => draft.settings[k]),
  ]).match(FIXTURE_ID)
  const mediaKeys = new Set(
    (referenced ?? []).map((id) => fixtureMediaKey(id))
  )
  const staticMedia = (await readStaticMedia(options.publicDir)).filter((m) =>
    mediaKeys.has(m.key as MediaKey)
  )
  const now = new Date()

  return db.transaction(async (tx) => {
    const insertedMedia = staticMedia.length
      ? await tx
          .insert(media)
          .values(staticMedia)
          .onConflictDoNothing({ target: [media.driver, media.key] })
          .returning({ id: media.id })
      : []
    const mediaRows = mediaKeys.size
      ? await tx
          .select({ id: media.id, key: media.key })
          .from(media)
          .where(
            and(eq(media.driver, "static"), inArray(media.key, [...mediaKeys]))
          )
      : []
    const mediaIdByKey = new Map(mediaRows.map((r) => [r.key, r.id]))
    const fx = contentFixtures((key) => {
      const id = mediaIdByKey.get(key)
      // Only rows being inserted resolve their media; any other lookup
      // gets the fixture id and is never written.
      return { mediaId: id ?? fixtureMediaLookup(key).mediaId }
    })

    const insertedSettings = settingKeys.length
      ? await tx
          .insert(settings)
          .values(
            settingKeys.map((key) => {
              const value = settingsSchemas[key].parse(fx.settings[key])
              return { key, draft: value, published: value }
            })
          )
          .onConflictDoNothing({ target: settings.key })
          .returning({ key: settings.key })
      : []
    const insertedPages = pageKeys.length
      ? await tx
          .insert(pages)
          .values(
            pageKeys.map((key) => {
              const data = templateSchemaFor(key).parse(fx.pages[key].data)
              return {
                key,
                template: PAGES[key],
                seo: seo.parse(fx.pages[key].seo),
                draft: data,
                published: data,
                status: "published" as const,
                publishedAt: now,
              }
            })
          )
          .onConflictDoNothing({ target: pages.key })
          .returning({ id: pages.id })
      : []
    if (insertedMedia.length || insertedSettings.length || insertedPages.length)
      await backfillMediaUsages(tx)
    return {
      media: insertedMedia.length,
      settings: insertedSettings.length,
      pages: insertedPages.length,
    }
  })
}

/**
 * Idempotent content seed (spec §14 db:seed): inserts every fixture row
 * that is missing, keyed by its natural key, and never overwrites existing
 * rows (admin edits survive a re-run). Versioned rows start published:
 * draft = published, version 1. Returns rows inserted per table.
 */
export async function seedContent(
  db: Db,
  options: { publicDir?: string } = {}
): Promise<SeedReport> {
  const staticMedia = await readStaticMedia(options.publicDir)
  const now = new Date()

  return db.transaction(async (tx) => {
    const insertedMedia = await tx
      .insert(media)
      .values(staticMedia)
      .onConflictDoNothing({ target: [media.driver, media.key] })
      .returning({ id: media.id })
    const mediaRows = await tx
      .select({ id: media.id, key: media.key })
      .from(media)
      .where(
        and(
          eq(media.driver, "static"),
          inArray(
            media.key,
            MEDIA.map((m) => m.key)
          )
        )
      )
    const mediaIdByKey = new Map(mediaRows.map((r) => [r.key, r.id]))
    const lookup: MediaLookup = (key) => {
      const id = mediaIdByKey.get(key)
      if (!id) throw new Error(`Seed: media ${key} is missing`)
      return { mediaId: id }
    }
    const fx = contentFixtures(lookup)

    const insertedCategories = await tx
      .insert(articleCategories)
      .values(
        fx.categories.map((c, sortOrder) => ({
          ...categorySchema.parse(c),
          sortOrder,
        }))
      )
      .onConflictDoNothing({ target: articleCategories.slug })
      .returning({ id: articleCategories.id })
    const categoryRows = await tx
      .select({ id: articleCategories.id, slug: articleCategories.slug })
      .from(articleCategories)
    const categoryIdBySlug = new Map(categoryRows.map((r) => [r.slug, r.id]))

    const insertedSettings = await tx
      .insert(settings)
      .values(
        SETTINGS_KEYS.map((key) => {
          const value = settingsSchemas[key].parse(fx.settings[key])
          return { key, draft: value, published: value }
        })
      )
      .onConflictDoNothing({ target: settings.key })
      .returning({ key: settings.key })

    const insertedPages = await tx
      .insert(pages)
      .values(
        PAGE_KEYS.map((key) => {
          const data = templateSchemaFor(key).parse(fx.pages[key].data)
          return {
            key,
            template: PAGES[key],
            seo: seo.parse(fx.pages[key].seo),
            draft: data,
            published: data,
            status: "published" as const,
            publishedAt: now,
          }
        })
      )
      .onConflictDoNothing({ target: pages.key })
      .returning({ id: pages.id })

    // Legal pages (privacy, terms): builder pages at the site root, in
    // footer order, published like the fixed pages.
    const insertedLegalPages = await tx
      .insert(builderPages)
      .values(
        fx.legalPages.map((page, legalOrder) => {
          const doc = DraftDocument.parse({
            blocks: [
              {
                id: "legal-hero",
                type: "hero.page",
                anchor: "hero",
                hidden: false,
                data: page.hero,
              },
              {
                id: "legal-text",
                type: "richtext",
                anchor: "policy",
                hidden: false,
                data: { doc: page.body },
              },
            ],
          })
          return {
            slug: page.slug,
            title: page.title,
            seo: seo.parse(page.seo),
            legalOrder,
            draft: doc,
            published: doc,
            status: "published" as const,
            publishedAt: now,
          }
        })
      )
      .onConflictDoNothing({ target: builderPages.slug })
      .returning({ id: builderPages.id })

    // Starter job postings (careers): published, "posted" a few days apart;
    // the closed ones keep the date they were closed.
    const DAY = 24 * 60 * 60_000
    const insertedJobs = await tx
      .insert(jobPostings)
      .values(
        fx.jobs.map((job, sortOrder) => {
          const content = jobContent.parse(job.content)
          const postedDaysAgo = [3, 5, 7, 10, 14, 70, 90, 110][sortOrder] ?? 30
          return {
            slug: job.slug,
            sortOrder,
            closedAt: job.closedAt,
            draft: content,
            published: content,
            status: "published" as const,
            publishedAt: new Date(now.getTime() - postedDaysAgo * DAY),
          }
        })
      )
      .onConflictDoNothing({ target: jobPostings.slug })
      .returning({ id: jobPostings.id })

    const insertedServices = await tx
      .insert(services)
      .values(
        fx.services.map((s, sortOrder) => {
          const content = serviceContent.parse(s.content)
          return {
            slug: s.slug,
            sortOrder,
            seo: seo.parse(s.seo),
            draft: content,
            published: content,
            status: "published" as const,
            publishedAt: now,
          }
        })
      )
      .onConflictDoNothing({ target: services.slug })
      .returning({ id: services.id })

    const insertedArticles = await tx
      .insert(articles)
      .values(
        fx.articles.map((a) => {
          const categoryId = categoryIdBySlug.get(a.categorySlug)
          if (!categoryId)
            throw new Error(`Seed: category ${a.categorySlug} is missing`)
          const content = articleContent.parse(a.content)
          return {
            slug: a.slug,
            categoryId,
            authorId: null,
            readTimeMinutes: a.readTimeMinutes,
            seo: seo.parse(a.seo),
            draft: content,
            published: content,
            status: "published" as const,
            publishedAt: a.publishedAt,
          }
        })
      )
      .onConflictDoNothing({ target: articles.slug })
      .returning({ id: articles.id })

    const insertedTeam = await tx
      .insert(teamMembers)
      .values(
        fx.team.map((member, sortOrder) => {
          const t = teamMemberSchema.parse(member)
          return {
            name: t.name,
            role: t.role,
            bio: t.bio,
            photoId: t.photo?.mediaId ?? null,
            sortOrder,
          }
        })
      )
      .onConflictDoNothing({ target: teamMembers.name })
      .returning({ id: teamMembers.id })

    const insertedClients = await tx
      .insert(clients)
      .values(
        fx.clients.map((client, sortOrder) => {
          const c = clientSchema.parse(client)
          return { name: c.name, logoId: c.logo.mediaId, url: c.url, sortOrder }
        })
      )
      .onConflictDoNothing({ target: clients.name })
      .returning({ id: clients.id })

    const insertedGroup = await tx
      .insert(groupCompanies)
      .values(
        fx.groupCompanies.map((company, sortOrder) => {
          const g = groupCompanySchema.parse(company)
          return {
            name: g.name,
            phone: g.phone,
            site: g.site,
            logoId: g.logo.mediaId,
            sortOrder,
          }
        })
      )
      .onConflictDoNothing({ target: groupCompanies.name })
      .returning({ id: groupCompanies.id })

    const insertedTestimonials = await tx
      .insert(testimonials)
      .values(
        fx.testimonials.map((testimonial, sortOrder) => ({
          ...testimonialSchema.parse(testimonial),
          sortOrder,
        }))
      )
      .onConflictDoNothing({ target: testimonials.name })
      .returning({ id: testimonials.id })

    // Ledger carry: seeded references were never in media_usages. Recomputed
    // from the current rows on every seed, so admin edits are kept.
    await backfillMediaUsages(tx)

    return {
      media: insertedMedia.length,
      articleCategories: insertedCategories.length,
      settings: insertedSettings.length,
      pages: insertedPages.length,
      legalPages: insertedLegalPages.length,
      jobPostings: insertedJobs.length,
      services: insertedServices.length,
      articles: insertedArticles.length,
      teamMembers: insertedTeam.length,
      clients: insertedClients.length,
      groupCompanies: insertedGroup.length,
      testimonials: insertedTestimonials.length,
    }
  })
}
