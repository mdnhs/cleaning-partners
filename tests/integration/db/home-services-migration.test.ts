import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { BlockInstance } from "@/blocks/registry"
import { getDb } from "@/server/db/client"
import { builderPages, pages, revisions, services } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { servicesFixture } from "@/server/db/seed/fixtures/services"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import type { HomeTemplate } from "@/templates/home/schema"
import { PAGES, templates } from "@/templates/registry"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_home_featured_services.sql")
)
const statements = readFileSync(join(DIR, file ?? "missing"), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

type Obj = Record<string, unknown>
type Item = Record<string, unknown>

const seededHome = pagesFixture(fixtureMediaLookup).home.data
const NEW_ITEMS = seededHome.services.items

/** The home services list as seeded before 0045 (free-text titles). */
const OLD_ITEMS: Item[] = [
  {
    title: "Medical Cleaning",
    description:
      "Hygienic, compliant cleaning for clinics and healthcare settings.",
  },
  {
    title: "Commercial Cleaning",
    description:
      "Offices, schools and workplaces kept spotless, on your schedule.",
  },
  {
    title: "Domestic Cleaning",
    description: "Reliable home cleaning, from regular visits to deep cleans.",
  },
]

const legacyHome = (items: Item[] = OLD_ITEMS): Obj => ({
  ...seededHome,
  services: { ...seededHome.services, items },
})
const legacyBlocks = (items?: Item[]) =>
  blocksFromTemplate("home", legacyHome(items) as unknown as HomeTemplate)

/** One transaction = one connection, so the pg_temp helpers stay visible. */
async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}

/** The seeded services, published (ULV Fogging only as a draft title). */
async function insertServices() {
  await getDb()
    .insert(services)
    .values(
      servicesFixture(fixtureMediaLookup).map((x, i) => ({
        slug: x.slug,
        sortOrder: i,
        draft: x.content,
        published: x.slug === "ulv-fogging" ? null : x.content,
      }))
    )
}
async function insertHome(draft: unknown, published: unknown) {
  await getDb()
    .insert(pages)
    .values({ key: "home", template: PAGES.home, draft, published })
}
const homePage = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "home")))[0]

const items = (doc: unknown) => (doc as HomeTemplate).services.items
const homeParse = (value: unknown) =>
  templates[PAGES.home].schema.safeParse(value).error
const introBlock = (doc: unknown) =>
  (doc as { blocks: BlockInstance[] }).blocks.find(
    (b) => b.type === "services"
  ) as { data: { intro: HomeTemplate["services"] } }

beforeEach(async () => {
  await resetDb()
  await insertServices()
})

describe("home_featured_services (custom data migration)", () => {
  it("has its file", () => {
    expect(file).toBe("0045_home_featured_services.sql")
  })

  it("replaces the seeded list with the new seeded list, in draft and published", async () => {
    await insertHome(legacyHome(), legacyHome())
    await migrate()
    const home = await homePage()
    for (const value of [home.draft, home.published]) {
      expect(value).toEqual(seededHome)
      expect(items(value).map((x) => x.service)).toEqual([
        "medical-cleaning",
        "commercial-cleaning",
        "retail-cleaning",
      ])
      expect(homeParse(value)).toBeUndefined()
    }
  })

  it("matches an edited list's titles to services and drops the rest", async () => {
    await insertHome(
      legacyHome([
        { title: "ULV Fogging", description: "x" },
        { title: "Window Washing", description: "no such service" },
        { title: "  retail CLEANING ", description: "Shops" },
      ]),
      legacyHome([{ title: "Domestic Cleaning", description: "Homes" }])
    )
    await migrate()
    const home = await homePage()
    // A draft-only service matches by its draft title.
    expect(items(home.draft)).toEqual([
      { service: "ulv-fogging", description: "x" },
      { service: "retail-cleaning", description: "Shops" },
    ])
    // Nothing matched: the new seeded list rather than an invalid empty one.
    expect(items(home.published)).toEqual(NEW_ITEMS)
    for (const value of [home.draft, home.published])
      expect(homeParse(value)).toBeUndefined()
  })

  it("keeps a service listed twice only once (its first item)", async () => {
    await insertHome(
      legacyHome([
        { title: "Medical Cleaning", description: "first" },
        { title: "Retail Cleaning", description: "retail" },
        { title: "medical cleaning ", description: "again" },
      ]),
      null
    )
    await migrate()
    const draft = (await homePage()).draft
    expect(items(draft)).toEqual([
      { service: "medical-cleaning", description: "first" },
      { service: "retail-cleaning", description: "retail" },
    ])
    expect(homeParse(draft)).toBeUndefined()
  })

  it("keeps at most six items (the schema's limit)", async () => {
    const base = servicesFixture(fixtureMediaLookup)[0]
    await getDb()
      .insert(services)
      .values(
        [0, 1, 2].map((i) => ({
          slug: `extra-${i}`,
          sortOrder: 10 + i,
          draft: { ...base.content, title: `Extra ${i}` },
          published: { ...base.content, title: `Extra ${i}` },
        }))
      )
    const titles = [
      ...servicesFixture(fixtureMediaLookup).map((x) => x.content.title),
      "Extra 0",
      "Extra 1",
      "Extra 2",
    ]
    expect(titles).toHaveLength(8)
    const many = titles.map((title, i) => ({ title, description: `d${i}` }))
    await insertHome(legacyHome(many), null)
    await migrate()
    const draft = (await homePage()).draft
    expect(items(draft).map((x) => x.description)).toEqual([
      "d0",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
    ])
    expect(homeParse(draft)).toBeUndefined()
  })

  it("leaves a NULL published NULL", async () => {
    await insertHome(legacyHome(), null)
    await migrate()
    const home = await homePage()
    expect(home.published).toBeNull()
    expect(home.draft).toEqual(seededHome)
  })

  it("rewrites builder copies of the services intro (version + 1)", async () => {
    const copy = { blocks: legacyBlocks() }
    const own = {
      blocks: legacyBlocks([{ title: "ULV Fogging", description: "x" }]),
    }
    const current = { blocks: blocksFromTemplate("home", seededHome) }
    await getDb()
      .insert(builderPages)
      .values([
        { slug: "copy", title: "Copy", draft: copy, published: copy },
        { slug: "draft-only", title: "Draft", draft: copy, published: null },
        { slug: "own", title: "Own", draft: own, published: own },
        { slug: "current", title: "Now", draft: current, published: current },
      ])
    await migrate()

    const rows = await getDb().select().from(builderPages)
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))
    expect(bySlug.copy.version).toBe(2)
    expect(bySlug["draft-only"].version).toBe(2)
    expect(bySlug["draft-only"].published).toBeNull()
    expect(bySlug.own.version).toBe(2)
    expect(bySlug.current.version).toBe(1)
    expect(bySlug.current.draft).toEqual(current)

    for (const side of ["draft", "published"] as const) {
      // A page copied from Home is Home's blocks with Home's (new) seeds.
      expect(
        (bySlug.copy[side] as { blocks: BlockInstance[] }).blocks.map(
          (b) => b.data
        )
      ).toEqual(blocksFromTemplate("home", seededHome).map((b) => b.data))
      expect(introBlock(bySlug.own[side]).data.intro.items).toEqual([
        { service: "ulv-fogging", description: "x" },
      ])
    }
    for (const row of rows)
      for (const doc of [row.draft, row.published])
        if (doc)
          for (const b of (doc as { blocks: unknown[] }).blocks)
            expect(BlockInstance.safeParse(b).error, row.slug).toBeUndefined()
  })

  it("rewrites home and builder revisions so restoring them validates", async () => {
    const builderId = "00000000-0000-4000-8000-000000000001"
    await getDb()
      .insert(revisions)
      .values([
        {
          entityType: "page",
          entityId: "home",
          version: 1,
          data: legacyHome(),
        },
        {
          entityType: "page",
          entityId: "about",
          version: 1,
          data: { services: { items: OLD_ITEMS } },
        },
        {
          entityType: "builder-page",
          entityId: builderId,
          version: 1,
          data: { blocks: legacyBlocks() },
        },
      ])
    await migrate()
    const rev = async (entityType: string, entityId: string) =>
      (
        await getDb()
          .select()
          .from(revisions)
          .where(
            and(
              eq(revisions.entityType, entityType),
              eq(revisions.entityId, entityId)
            )
          )
      )[0].data
    const home = await rev("page", "home")
    expect(home).toEqual(seededHome)
    expect(homeParse(home)).toBeUndefined()
    // Another page's revision is not touched.
    expect(await rev("page", "about")).toEqual({
      services: { items: OLD_ITEMS },
    })
    const builder = await rev("builder-page", builderId)
    expect(introBlock(builder).data.intro.items).toEqual(NEW_ITEMS)
    for (const b of (builder as { blocks: unknown[] }).blocks)
      expect(BlockInstance.safeParse(b).error).toBeUndefined()
  })

  it("is a no-op the second time", async () => {
    await insertHome(
      legacyHome([{ title: "ULV Fogging", description: "x" }]),
      legacyHome()
    )
    const doc = { blocks: legacyBlocks() }
    await getDb()
      .insert(builderPages)
      .values({ slug: "copy", title: "Copy", draft: doc, published: doc })
    await migrate()
    const snapshot = async () => ({
      pages: await getDb().select().from(pages),
      builder: await getDb().select().from(builderPages),
      revisions: await getDb().select().from(revisions),
    })
    const once = await snapshot()
    await migrate()
    expect(await snapshot()).toEqual(once)
    expect(once.builder[0].version).toBe(2)
  })
})
