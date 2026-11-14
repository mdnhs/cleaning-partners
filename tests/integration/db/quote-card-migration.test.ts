import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { BlockInstance } from "@/blocks/registry"
import { settingsSchemas, type SettingsKey } from "@/lib/schemas/settings"
import { getDb } from "@/server/db/client"
import { builderPages, pages, revisions, settings } from "@/server/db/schema"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import { PAGES, templates } from "@/templates/registry"
import type { ServicesTemplate } from "@/templates/services/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) => f.endsWith("_shared_quote_card.sql"))
const statements = readFileSync(join(DIR, file ?? "missing"), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

type Obj = Record<string, unknown>

const seededSettings = settingsFixture(fixtureMediaLookup)
const seededPages = pagesFixture(fixtureMediaLookup)

const BODY =
  "Tell us about your space and we'll put together a cleaning plan and price that suits you."
const OWN_BODY = "Send us a few lines and we will call you back."

/** settings.microcopy before 0044: the phone line was `telLabel`. */
const legacyMicrocopy = (card: Obj = {}): Obj => {
  const { phoneLabel, ...rest } = seededSettings.microcopy.quoteCard
  return {
    ...seededSettings.microcopy,
    quoteCard: { ...rest, telLabel: phoneLabel, ...card },
  }
}
/** settings.sections.contact before 0044: the quote box had its own copy. */
const legacySectionsContact = (box: Obj = {}): Obj => ({
  ...seededSettings["sections.contact"],
  quoteBox: {
    ...seededSettings["sections.contact"].quoteBox,
    title: "Need a Quote?",
    body: BODY,
    ...box,
  },
})
/** The services help card before 0044: its own copy and `callLabel`. */
const legacyHelpCard = (card: Obj = {}): Obj => {
  const { phoneLabel, ...rest } = seededPages.services.data.grid.helpCard
  return { ...rest, body: BODY, callLabel: phoneLabel, ...card }
}
const legacyServices = (card: Obj = {}): Obj => ({
  ...seededPages.services.data,
  grid: { ...seededPages.services.data.grid, helpCard: legacyHelpCard(card) },
})
const legacyBlocks = (card: Obj = {}) =>
  blocksFromTemplate(
    "services",
    legacyServices(card) as unknown as ServicesTemplate
  )

/** One transaction = one connection, so the pg_temp helpers stay visible. */
async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}

const setting = async (key: string) =>
  (await getDb().select().from(settings).where(eq(settings.key, key)))[0]
const servicesPage = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "services")))[0]

async function insertSettings(rows: [string, unknown, unknown][]) {
  await getDb()
    .insert(settings)
    .values(rows.map(([key, draft, published]) => ({ key, draft, published })))
}
async function insertServices(draft: unknown, published: unknown) {
  await getDb()
    .insert(pages)
    .values({ key: "services", template: PAGES.services, draft, published })
}

const at = (value: unknown, path: string) =>
  path.split(".").reduce<unknown>((v, k) => (v as Obj)[k], value)
const settingsParse = (key: SettingsKey, value: unknown) =>
  settingsSchemas[key].safeParse(value).error
const servicesParse = (value: unknown) =>
  templates[PAGES.services].schema.safeParse(value).error
const gridBlock = (doc: unknown) =>
  (doc as { blocks: BlockInstance[] }).blocks.find(
    (b) => b.type === "services"
  ) as { data: Obj }

beforeEach(resetDb)

describe("shared_quote_card (custom data migration)", () => {
  it("has its file", () => {
    expect(file).toBe("0044_shared_quote_card.sql")
  })

  it("empties the seeded overrides and renames the phone lines, in draft and published", async () => {
    await insertSettings([
      ["microcopy", legacyMicrocopy(), legacyMicrocopy()],
      ["sections.contact", legacySectionsContact(), legacySectionsContact()],
    ])
    await insertServices(legacyServices(), legacyServices())
    await migrate()

    for (const key of ["microcopy", "sections.contact"] as const) {
      const row = await setting(key)
      for (const value of [row.draft, row.published]) {
        expect(value, key).toEqual(seededSettings[key])
        expect(settingsParse(key, value)).toBeUndefined()
      }
    }
    expect(at((await setting("microcopy")).draft, "quoteCard.phoneLabel")).toBe(
      "Tel: {office} Ext {officeExtension}"
    )
    expect(at((await setting("sections.contact")).draft, "quoteBox")).toEqual({
      title: null,
      body: null,
      cta: { label: "Fill the Form", href: "{quoteHref}" },
    })
    const services = await servicesPage()
    for (const value of [services.draft, services.published]) {
      expect(value).toEqual(seededPages.services.data)
      expect(servicesParse(value)).toBeUndefined()
      expect(at(value, "grid.helpCard")).toMatchObject({
        title: "Not sure what you need?",
        body: null,
        phoneLabel: "Or call {office} Ext {officeExtension}",
      })
    }
  })

  it("keeps edited text as the place's own override", async () => {
    await insertSettings([
      // Draft: the shared title was edited, so the box's seeded title
      // no longer matches it and stays (rendering unchanged).
      [
        "microcopy",
        legacyMicrocopy({ title: "Get a price", telLabel: "Ring {office}" }),
        legacyMicrocopy(),
      ],
      [
        "sections.contact",
        legacySectionsContact({ body: OWN_BODY }),
        legacySectionsContact({ title: "Quote?" }),
      ],
    ])
    await insertServices(
      legacyServices({ body: OWN_BODY, callLabel: "Phone {office}" }),
      legacyServices({ title: "Need a Quote?" })
    )
    await migrate()

    const micro = await setting("microcopy")
    expect(at(micro.draft, "quoteCard")).toEqual({
      ...seededSettings.microcopy.quoteCard,
      title: "Get a price",
      phoneLabel: "Ring {office}",
    })
    const box = await setting("sections.contact")
    expect(at(box.draft, "quoteBox.title")).toBe("Need a Quote?")
    expect(at(box.draft, "quoteBox.body")).toBe(OWN_BODY)
    expect(at(box.published, "quoteBox.title")).toBe("Quote?")
    expect(at(box.published, "quoteBox.body")).toBeNull()
    for (const value of [box.draft, box.published])
      expect(settingsParse("sections.contact", value)).toBeUndefined()

    const services = await servicesPage()
    expect(at(services.draft, "grid.helpCard")).toMatchObject({
      title: "Not sure what you need?",
      body: OWN_BODY,
      phoneLabel: "Phone {office}",
    })
    expect(at(services.draft, "grid.helpCard")).not.toHaveProperty("callLabel")
    // The help card's own seeded title only: another place's seeded title
    // (the shared one) set here by an admin is kept.
    expect(at(services.published, "grid.helpCard.title")).toBe("Need a Quote?")
    expect(at(services.published, "grid.helpCard.body")).toBeNull()
    for (const value of [services.draft, services.published])
      expect(servicesParse(value)).toBeUndefined()
  })

  it("compares each column with the same column of the shared card", async () => {
    // Published microcopy has its own body: the published overrides keep
    // theirs; the draft ones match the draft card and are emptied.
    await insertSettings([
      ["microcopy", legacyMicrocopy(), legacyMicrocopy({ body: OWN_BODY })],
      ["sections.contact", legacySectionsContact(), legacySectionsContact()],
    ])
    await insertServices(legacyServices(), legacyServices())
    await migrate()
    const box = await setting("sections.contact")
    expect(at(box.draft, "quoteBox.body")).toBeNull()
    expect(at(box.published, "quoteBox.body")).toBe(BODY)
    expect(at(box.published, "quoteBox.title")).toBeNull()
    const services = await servicesPage()
    expect(at(services.draft, "grid.helpCard.body")).toBeNull()
    expect(at(services.published, "grid.helpCard.body")).toBe(BODY)
  })

  it("without a shared card only renames", async () => {
    await insertSettings([
      ["sections.contact", legacySectionsContact(), legacySectionsContact()],
    ])
    await insertServices(legacyServices(), null)
    await migrate()
    expect(at((await setting("sections.contact")).draft, "quoteBox")).toEqual(
      legacySectionsContact().quoteBox
    )
    const services = await servicesPage()
    expect(at(services.draft, "grid.helpCard.body")).toBe(BODY)
    expect(at(services.draft, "grid.helpCard.phoneLabel")).toBe(
      "Or call {office} Ext {officeExtension}"
    )
  })

  it("leaves a NULL published NULL", async () => {
    await insertSettings([
      ["microcopy", legacyMicrocopy(), null],
      ["sections.contact", legacySectionsContact(), null],
    ])
    await insertServices(legacyServices(), null)
    await migrate()
    expect((await setting("microcopy")).published).toBeNull()
    expect((await setting("sections.contact")).published).toBeNull()
    expect((await servicesPage()).published).toBeNull()
    expect((await setting("sections.contact")).draft).toEqual(
      seededSettings["sections.contact"]
    )
  })

  it("rewrites builder copies of the services grid (version + 1)", async () => {
    await insertSettings([["microcopy", legacyMicrocopy(), legacyMicrocopy()]])
    const copy = { blocks: legacyBlocks() }
    const own = {
      blocks: legacyBlocks({ body: OWN_BODY, callLabel: "Phone us" }),
    }
    const intro = { blocks: blocksFromTemplate("home", seededPages.home.data) }
    await getDb()
      .insert(builderPages)
      .values([
        { slug: "copy", title: "Copy", draft: copy, published: copy },
        { slug: "draft-only", title: "Draft", draft: copy, published: null },
        { slug: "own", title: "Own", draft: own, published: own },
        { slug: "home", title: "Home", draft: intro, published: intro },
      ])
    await migrate()

    const rows = await getDb().select().from(builderPages)
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))
    expect(bySlug.copy.version).toBe(2)
    expect(bySlug["draft-only"].version).toBe(2)
    expect(bySlug["draft-only"].published).toBeNull()
    expect(bySlug.own.version).toBe(2)
    expect(bySlug.home.version).toBe(1)
    expect(bySlug.home.draft).toEqual(intro)

    for (const side of ["draft", "published"] as const) {
      // A copied page is the template's blocks with the template's (new) seeds.
      expect(
        (bySlug.copy[side] as { blocks: BlockInstance[] }).blocks.map(
          (b) => b.data
        )
      ).toEqual(
        blocksFromTemplate("services", seededPages.services.data).map(
          (b) => b.data
        )
      )
      expect(at(gridBlock(bySlug.own[side]).data, "grid.helpCard")).toEqual({
        ...seededPages.services.data.grid.helpCard,
        body: OWN_BODY,
        phoneLabel: "Phone us",
      })
    }
    for (const row of rows)
      for (const doc of [row.draft, row.published])
        if (doc)
          for (const b of (doc as { blocks: unknown[] }).blocks)
            expect(BlockInstance.safeParse(b).error, row.slug).toBeUndefined()
  })

  it("renames the phone line in microcopy, services and builder revisions only", async () => {
    await insertSettings([
      ["microcopy", legacyMicrocopy(), legacyMicrocopy()],
      ["sections.contact", legacySectionsContact(), legacySectionsContact()],
    ])
    await insertServices(legacyServices(), legacyServices())
    const builderDoc = { blocks: legacyBlocks() }
    await getDb()
      .insert(revisions)
      .values([
        {
          entityType: "settings",
          entityId: "microcopy",
          version: 1,
          data: legacyMicrocopy(),
        },
        {
          entityType: "settings",
          entityId: "sections.contact",
          version: 1,
          data: legacySectionsContact(),
        },
        {
          entityType: "page",
          entityId: "services",
          version: 1,
          data: legacyServices(),
        },
        {
          entityType: "builder-page",
          entityId: "00000000-0000-4000-8000-000000000001",
          version: 1,
          data: builderDoc,
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
    const micro = await rev("settings", "microcopy")
    expect(micro).toEqual(seededSettings.microcopy)
    expect(settingsParse("microcopy", micro)).toBeUndefined()
    // Old quote box copy still parses: an override with the same words.
    const box = await rev("settings", "sections.contact")
    expect(box).toEqual(legacySectionsContact())
    expect(settingsParse("sections.contact", box)).toBeUndefined()
    const services = await rev("page", "services")
    expect(at(services, "grid.helpCard")).toEqual({
      ...seededPages.services.data.grid.helpCard,
      body: BODY,
    })
    expect(servicesParse(services)).toBeUndefined()
    const builder = await rev(
      "builder-page",
      "00000000-0000-4000-8000-000000000001"
    )
    const help = at(gridBlock(builder).data, "grid.helpCard") as Obj
    expect(help.phoneLabel).toBe("Or call {office} Ext {officeExtension}")
    expect(help.body).toBe(BODY)
    expect(help).not.toHaveProperty("callLabel")
    for (const b of (builder as { blocks: unknown[] }).blocks)
      expect(BlockInstance.safeParse(b).error).toBeUndefined()
  })

  it("is a no-op the second time", async () => {
    await insertSettings([
      ["microcopy", legacyMicrocopy(), legacyMicrocopy()],
      ["sections.contact", legacySectionsContact(), legacySectionsContact()],
    ])
    await insertServices(legacyServices(), legacyServices())
    const doc = { blocks: legacyBlocks() }
    await getDb()
      .insert(builderPages)
      .values({ slug: "copy", title: "Copy", draft: doc, published: doc })
    await migrate()
    const snapshot = async () => ({
      settings: await getDb().select().from(settings),
      pages: await getDb().select().from(pages),
      builder: await getDb().select().from(builderPages),
    })
    const once = await snapshot()
    await migrate()
    expect(await snapshot()).toEqual(once)
    expect(once.builder[0].version).toBe(2)
  })
})
