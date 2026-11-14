import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { BlockInstance } from "@/blocks/registry"
import { getDb } from "@/server/db/client"
import { builderPages, pages, revisions } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import { PAGES, templates } from "@/templates/registry"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) => f.endsWith("_page_hero_image.sql"))!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const seeded = pagesFixture(fixtureMediaLookup)
const TEXT_ONLY = ["about", "contact", "careers"] as const
type Key = (typeof TEXT_ONLY)[number] | "services" | "blog"
type Hero = { image?: unknown; crumb: string }

/** A page as stored before 0038: about/contact/careers heroes have no `image`. */
const legacy = (key: Key) => {
  const data = seeded[key].data as unknown as { hero: Hero }
  const { image, ...hero } = data.hero
  void image
  return { ...data, hero }
}
const heroOf = (value: unknown) => (value as { hero: Hero }).hero
const schemaOf = (key: Key) => templates[PAGES[key]].schema
const IMAGE = { mediaId: "0b1c2d3e-4f50-4a61-8b72-9c83d4e5f607" }

async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}
const row = async (key: Key) =>
  (await getDb().select().from(pages).where(eq(pages.key, key)))[0]
const insert = (key: Key, draft: unknown, published: unknown) =>
  getDb().insert(pages).values({ key, template: PAGES[key], draft, published })

beforeEach(resetDb)

describe("page_hero_image (custom data migration)", () => {
  it("adds image: null to the about, contact and careers heroes", async () => {
    for (const key of TEXT_ONLY) await insert(key, legacy(key), legacy(key))
    await migrate()
    for (const key of TEXT_ONLY) {
      const after = await row(key)
      expect(heroOf(after.draft), key).toHaveProperty("image", null)
      expect(heroOf(after.published), key).toHaveProperty("image", null)
      expect(schemaOf(key).parse(after.draft)).toEqual(
        schemaOf(key).parse(seeded[key].data)
      )
      expect(schemaOf(key).safeParse(after.published).success, key).toBe(true)
    }
  })

  it("keeps a banner already stored (services, blog, an admin's own)", async () => {
    for (const key of ["services", "blog"] as const)
      await insert(key, seeded[key].data, seeded[key].data)
    const own = {
      ...legacy("about"),
      hero: { ...legacy("about").hero, image: IMAGE },
    }
    await insert("about", own, own)
    await migrate()
    for (const key of ["services", "blog"] as const) {
      const after = await row(key)
      expect(after.draft, key).toEqual(seeded[key].data)
      expect(after.published, key).toEqual(seeded[key].data)
      expect(schemaOf(key).safeParse(after.draft).success, key).toBe(true)
    }
    const about = await row("about")
    expect(heroOf(about.draft).image).toEqual(IMAGE)
    expect(heroOf(about.published).image).toEqual(IMAGE)
    expect(schemaOf("about").safeParse(about.draft).success).toBe(true)
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insert("contact", legacy("contact"), null)
    await migrate()
    const once = await row("contact")
    await migrate()
    const twice = await row("contact")
    expect(twice.published).toBeNull()
    expect(twice.draft).toEqual(once.draft)
    expect(schemaOf("contact").safeParse(twice.draft).success).toBe(true)
  })

  it("adds the key to those pages' revisions only", async () => {
    const services = { hero: { crumb: "Services" } }
    await getDb()
      .insert(revisions)
      .values([
        ...TEXT_ONLY.map((key) => ({
          entityType: "page",
          entityId: key,
          version: 1,
          data: legacy(key),
        })),
        {
          entityType: "page",
          entityId: "services",
          version: 1,
          data: services,
        },
        {
          entityType: "settings",
          entityId: "about",
          version: 1,
          data: services,
        },
      ])
    await migrate()
    for (const key of TEXT_ONLY) {
      const [rev] = await getDb()
        .select()
        .from(revisions)
        .where(
          and(eq(revisions.entityType, "page"), eq(revisions.entityId, key))
        )
      expect(heroOf(rev.data), key).toHaveProperty("image", null)
      expect(schemaOf(key).safeParse(rev.data).success, key).toBe(true)
    }
    const untouched = await getDb()
      .select()
      .from(revisions)
      .where(
        sql`${revisions.entityId} = 'services' OR ${revisions.entityType} = 'settings'`
      )
    expect(untouched.map((r) => r.data)).toEqual([services, services])
  })

  it("leaves builder hero.page blocks as they are (same shape, still valid)", async () => {
    const blocks = blocksFromTemplate("about", seeded.about.data)
    const doc = { blocks }
    await getDb()
      .insert(builderPages)
      .values({ slug: "copy", title: "Copy", draft: doc, published: doc })
    await migrate()
    const [after] = await getDb().select().from(builderPages)
    expect(after.draft).toEqual(doc)
    expect(after.published).toEqual(doc)
    expect(after.version).toBe(1)
    for (const block of [
      ...(after.draft as typeof doc).blocks,
      ...(after.published as typeof doc).blocks,
    ])
      expect(BlockInstance.safeParse(block).success, block.type).toBe(true)
  })
})
