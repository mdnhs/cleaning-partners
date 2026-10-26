import "server-only"

import { and, asc, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm"

import type { Seo } from "@/lib/schemas/common"
import type { OgKind } from "@/lib/seo/urls"
import type { DbOrTx } from "@/server/db/client"
import {
  articles,
  builderPages,
  pages,
  revisions,
  services,
} from "@/server/db/schema"

export type SitemapRow = {
  kind: "page" | "service" | "article" | "builder"
  /** Page key or slug (a builder page's slug: /p/<slug>). */
  key: string
  seo: Seo
  publishedAt: Date | null
  /** Time of the newest revision (one is written per publish). */
  lastPublish: Date | null
}

/** Newest revision of one record (prefix of revisions_entity_version_unique). */
const lastPublish = (entityType: string, entityId: SQL) =>
  sql<Date | null>`(select max(${revisions.createdAt}) from ${revisions} where ${revisions.entityType} = ${entityType} and ${revisions.entityId} = ${entityId})`.mapWith(
    revisions.createdAt
  )

/** Published pages, services, articles and builder pages for the sitemap (never drafts). */
export async function listSitemapRows(db: DbOrTx): Promise<SitemapRow[]> {
  const [pageRows, serviceRows, articleRows, builderRows] = await Promise.all([
    db
      .select({
        key: pages.key,
        seo: pages.seo,
        publishedAt: pages.publishedAt,
        lastPublish: lastPublish("page", sql`${pages.key}`),
      })
      .from(pages)
      .where(isNotNull(pages.published))
      .orderBy(asc(pages.key)),
    db
      .select({
        key: services.slug,
        seo: services.seo,
        publishedAt: services.publishedAt,
        lastPublish: lastPublish("service", sql`${services.id}::text`),
      })
      .from(services)
      .where(isNotNull(services.published))
      .orderBy(asc(services.sortOrder), asc(services.slug)),
    db
      .select({
        key: articles.slug,
        seo: articles.seo,
        publishedAt: articles.publishedAt,
        lastPublish: lastPublish("article", sql`${articles.id}::text`),
      })
      .from(articles)
      .where(isNotNull(articles.published))
      .orderBy(desc(articles.publishedAt), asc(articles.slug)),
    db
      .select({
        key: builderPages.slug,
        seo: builderPages.seo,
        publishedAt: builderPages.publishedAt,
        lastPublish: lastPublish("builder-page", sql`${builderPages.id}::text`),
      })
      .from(builderPages)
      .where(isNotNull(builderPages.published))
      .orderBy(asc(builderPages.slug)),
  ])
  return [
    ...pageRows.map((row) => ({ kind: "page" as const, ...row })),
    ...serviceRows.map((row) => ({ kind: "service" as const, ...row })),
    ...articleRows.map((row) => ({ kind: "article" as const, ...row })),
    ...builderRows.map((row) => ({ kind: "builder" as const, ...row })),
  ]
}

/**
 * The published name of a record: a page's hero title, a service's or
 * article's title. null when the record is published but has no name of
 * its own (home, or a page without a hero title): the caller uses the
 * site title. undefined when the record is unknown or not published
 * (drafts never reach share cards).
 */
export async function findPublishedName(
  db: DbOrTx,
  kind: OgKind,
  id: string
): Promise<string | null | undefined> {
  if (kind === "page") {
    const [row] = await db
      .select({ published: pages.published })
      .from(pages)
      .where(eq(pages.key, id))
    if (!row?.published) return undefined
    if (id === "home") return null
    const title = (row.published as { hero?: { title?: unknown } }).hero?.title
    return typeof title === "string" ? title : null
  }
  if (kind === "builder") {
    // By id (uuid, checked by isOgSubjectId): the card survives slug changes.
    const [row] = await db
      .select({ title: builderPages.title })
      .from(builderPages)
      .where(and(eq(builderPages.id, id), isNotNull(builderPages.published)))
    return row ? row.title : undefined
  }
  if (kind === "service") {
    const [row] = await db
      .select({ title: sql<string | null>`${services.published}->>'title'` })
      .from(services)
      .where(and(eq(services.slug, id), isNotNull(services.published)))
    return row ? row.title : undefined
  }
  const [row] = await db
    .select({ title: sql<string | null>`${articles.published}->>'title'` })
    .from(articles)
    .where(and(eq(articles.slug, id), isNotNull(articles.published)))
  return row ? row.title : undefined
}
