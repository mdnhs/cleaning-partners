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
import type { AboutTemplate } from "@/templates/about/schema"
import type { HomeTemplate } from "@/templates/home/schema"
import { PAGES, templates, type PageKey } from "@/templates/registry"
import type { ServicesTemplate } from "@/templates/services/schema"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) =>
  f.endsWith("_quote_cta_placeholders.sql")
)!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

type Obj = Record<string, unknown>
type Link = { label: string; href: string }

const seededSettings = settingsFixture(fixtureMediaLookup)
const seededPages = pagesFixture(fixtureMediaLookup)

const QUOTE: Link = { label: "{quoteLabel}", href: "{quoteHref}" }
const OWN: Link = { label: "Book now", href: "/book" }

/** The seeded links as stored before 0043. */
const OLD = {
  header: { label: "Get a Quote", href: "#contact" },
  hero: { label: "Get a Free Quote", href: "#contact" },
  servicesQuote: { label: "Get A Quote", href: "#contact" },
  help: { label: "Contact Us", href: "#contact" },
  quoteBox: { label: "Fill the Form", href: "/contact#quote" },
}

/** settings.contact before 0043: no quote button text or address. */
const legacyContact = (): Obj => {
  const { quoteLabel, quoteHref, ...contact } = seededSettings.contact
  void quoteLabel
  void quoteHref
  return contact
}
const legacyNavigation = (cta: Link = OLD.header): Obj => ({
  ...seededSettings.navigation,
  cta,
})
const legacyMicrocopy = (cta: Link = OLD.hero): Obj => ({
  ...seededSettings.microcopy,
  quoteCard: { ...seededSettings.microcopy.quoteCard, cta },
})
const legacySectionsContact = (cta: Link = OLD.quoteBox): Obj => ({
  ...seededSettings["sections.contact"],
  quoteBox: { ...seededSettings["sections.contact"].quoteBox, cta },
})
const legacyHome = (primaryCta: Link = OLD.hero): HomeTemplate => ({
  ...seededPages.home.data,
  hero: { ...seededPages.home.data.hero, primaryCta },
})
const legacyAbout = (cta: Link = OLD.hero): AboutTemplate => ({
  ...seededPages.about.data,
  story: { ...seededPages.about.data.story, cta },
})
const legacyServices = (
  quoteCta: Link = OLD.servicesQuote,
  help: Link = OLD.help
): ServicesTemplate => ({
  ...seededPages.services.data,
  grid: {
    ...seededPages.services.data.grid,
    quoteCta,
    helpCard: { ...seededPages.services.data.grid.helpCard, cta: help },
  },
})

/** One transaction = one connection, so the pg_temp helpers stay visible. */
async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}

const setting = async (key: string) =>
  (await getDb().select().from(settings).where(eq(settings.key, key)))[0]
const page = async (key: string) =>
  (await getDb().select().from(pages).where(eq(pages.key, key)))[0]

async function insertSettings(rows: [string, unknown, unknown][]) {
  await getDb()
    .insert(settings)
    .values(rows.map(([key, draft, published]) => ({ key, draft, published })))
}
async function insertPages(rows: [PageKey, unknown, unknown][]) {
  await getDb()
    .insert(pages)
    .values(
      rows.map(([key, draft, published]) => ({
        key,
        template: PAGES[key],
        draft,
        published,
      }))
    )
}

/** Everything as stored before 0043, draft and published alike. */
async function insertLegacy() {
  await insertSettings([
    ["contact", legacyContact(), legacyContact()],
    ["navigation", legacyNavigation(), legacyNavigation()],
    ["microcopy", legacyMicrocopy(), legacyMicrocopy()],
    ["sections.contact", legacySectionsContact(), legacySectionsContact()],
  ])
  await insertPages([
    ["home", legacyHome(), legacyHome()],
    ["about", legacyAbout(), legacyAbout()],
    ["services", legacyServices(), legacyServices()],
  ])
}

const at = (value: unknown, path: string) =>
  path.split(".").reduce<unknown>((v, k) => (v as Obj)[k], value)

const settingsParse = (key: SettingsKey, value: unknown) =>
  settingsSchemas[key].safeParse(value).error
const pageParse = (key: PageKey, value: unknown) =>
  templates[PAGES[key]].schema.safeParse(value).error

beforeEach(resetDb)

describe("quote_cta_placeholders (custom data migration)", () => {
  it("rewrites the seeded quote buttons to the placeholders, in draft and published", async () => {
    await insertLegacy()
    await migrate()

    const contact = await setting("contact")
    for (const value of [contact.draft, contact.published]) {
      expect(value).toEqual(seededSettings.contact)
      expect(settingsParse("contact", value)).toBeUndefined()
    }
    const expectSetting = async (key: SettingsKey, path: string, to: Link) => {
      const row = await setting(key)
      for (const value of [row.draft, row.published]) {
        expect(at(value, path), `${key}.${path}`).toEqual(to)
        expect(settingsParse(key, value)).toBeUndefined()
        expect(value).toEqual(seededSettings[key])
      }
    }
    await expectSetting("navigation", "cta", {
      label: "Get a Quote",
      href: "{quoteHref}",
    })
    await expectSetting("microcopy", "quoteCard.cta", QUOTE)
    await expectSetting("sections.contact", "quoteBox.cta", {
      label: "Fill the Form",
      href: "{quoteHref}",
    })

    const expectPage = async (key: PageKey, paths: [string, Link][]) => {
      const row = await page(key)
      for (const value of [row.draft, row.published]) {
        for (const [path, to] of paths)
          expect(at(value, path), `${key}.${path}`).toEqual(to)
        expect(pageParse(key, value)).toBeUndefined()
        expect(value).toEqual(seededPages[key].data)
      }
    }
    await expectPage("home", [["hero.primaryCta", QUOTE]])
    await expectPage("about", [["story.cta", QUOTE]])
    await expectPage("services", [
      ["grid.quoteCta", QUOTE],
      ["grid.helpCard.cta", { label: "Contact Us", href: "{quoteHref}" }],
    ])
  })

  it("keeps admin-edited buttons and a stored quote text and address", async () => {
    const ownContact = {
      ...legacyContact(),
      quoteLabel: "Ask us",
      quoteHref: "/quote",
    }
    await insertSettings([
      ["contact", ownContact, legacyContact()],
      ["navigation", legacyNavigation(OWN), legacyNavigation()],
      ["microcopy", legacyMicrocopy(OWN), legacyMicrocopy()],
      [
        "sections.contact",
        legacySectionsContact({ label: "Fill the Form", href: "/contact" }),
        legacySectionsContact(),
      ],
    ])
    await insertPages([
      ["home", legacyHome(OWN), legacyHome()],
      // Same href, other words: an edit, kept.
      ["about", legacyAbout({ label: "Talk to us", href: "#contact" }), null],
      ["services", legacyServices(OWN, OWN), legacyServices()],
    ])
    await migrate()

    const contact = await setting("contact")
    expect(contact.draft).toEqual(ownContact)
    expect(contact.published).toEqual(seededSettings.contact)
    expect(at((await setting("navigation")).draft, "cta")).toEqual(OWN)
    expect(at((await setting("microcopy")).draft, "quoteCard.cta")).toEqual(OWN)
    expect(
      at((await setting("sections.contact")).draft, "quoteBox.cta")
    ).toEqual({ label: "Fill the Form", href: "/contact" })
    expect(at((await page("home")).draft, "hero.primaryCta")).toEqual(OWN)
    const about = await page("about")
    expect(at(about.draft, "story.cta")).toEqual({
      label: "Talk to us",
      href: "#contact",
    })
    expect(about.published).toBeNull()
    const services = await page("services")
    expect(at(services.draft, "grid.quoteCta")).toEqual(OWN)
    expect(at(services.draft, "grid.helpCard.cta")).toEqual(OWN)
    // The published side, still seeded, is rewritten.
    expect(at(services.published, "grid.quoteCta")).toEqual(QUOTE)
    expect(at((await setting("navigation")).published, "cta")).toEqual({
      label: "Get a Quote",
      href: "{quoteHref}",
    })
  })

  it("leaves a NULL published NULL", async () => {
    await insertSettings([
      ["contact", legacyContact(), null],
      ["navigation", legacyNavigation(), null],
    ])
    await insertPages([["home", legacyHome(), null]])
    await migrate()
    expect((await setting("contact")).published).toBeNull()
    expect((await setting("navigation")).published).toBeNull()
    expect((await page("home")).published).toBeNull()
    expect((await setting("contact")).draft).toEqual(seededSettings.contact)
  })

  it("rewrites builder copies of the hero, story and services grid (version + 1)", async () => {
    const homeCopy = { blocks: blocksFromTemplate("home", legacyHome()) }
    const aboutCopy = { blocks: blocksFromTemplate("about", legacyAbout()) }
    const servicesCopy = {
      blocks: blocksFromTemplate("services", legacyServices()),
    }
    const own = {
      blocks: blocksFromTemplate("services", legacyServices(OWN, OWN)),
    }
    await getDb()
      .insert(builderPages)
      .values([
        {
          slug: "home-copy",
          title: "Home",
          draft: homeCopy,
          published: homeCopy,
        },
        {
          slug: "about-copy",
          title: "About",
          draft: aboutCopy,
          published: null,
        },
        {
          slug: "services-copy",
          title: "Services",
          draft: servicesCopy,
          published: servicesCopy,
        },
        { slug: "own", title: "Own", draft: own, published: own },
      ])
    await migrate()

    const rows = await getDb().select().from(builderPages)
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))
    expect(bySlug["home-copy"].version).toBe(2)
    expect(bySlug["about-copy"].version).toBe(2)
    expect(bySlug["about-copy"].published).toBeNull()
    expect(bySlug["services-copy"].version).toBe(2)
    expect(bySlug.own.version).toBe(1)
    expect(bySlug.own.draft).toEqual(own)

    const block = (slug: string, type: string, side: "draft" | "published") =>
      (bySlug[slug][side] as { blocks: BlockInstance[] }).blocks.find(
        (b) => b.type === type
      ) as { data: Obj }
    for (const side of ["draft", "published"] as const) {
      expect(at(block("home-copy", "hero", side).data, "primaryCta")).toEqual(
        QUOTE
      )
      const grid = block("services-copy", "services", side).data
      expect(at(grid, "grid.quoteCta")).toEqual(QUOTE)
      expect(at(grid, "grid.helpCard.cta")).toEqual({
        label: "Contact Us",
        href: "{quoteHref}",
      })
    }
    expect(at(block("about-copy", "ourStory", "draft").data, "cta")).toEqual(
      QUOTE
    )
    // A copied page is the template's blocks with the template's (new) seeds.
    expect(
      (bySlug["services-copy"].draft as { blocks: BlockInstance[] }).blocks.map(
        (b) => b.data
      )
    ).toEqual(
      blocksFromTemplate("services", seededPages.services.data).map(
        (b) => b.data
      )
    )
    for (const row of rows)
      for (const doc of [row.draft, row.published])
        if (doc)
          for (const b of (doc as { blocks: unknown[] }).blocks)
            expect(BlockInstance.safeParse(b).error, row.slug).toBeUndefined()
  })

  it("adds the quote text and address to the contact revisions only", async () => {
    await insertLegacy()
    const own = { ...legacyContact(), quoteHref: "/quote" }
    await getDb()
      .insert(revisions)
      .values([
        {
          entityType: "settings",
          entityId: "contact",
          version: 1,
          data: legacyContact(),
        },
        { entityType: "settings", entityId: "contact", version: 2, data: own },
        {
          entityType: "settings",
          entityId: "site",
          version: 1,
          data: { a: 1 },
        },
      ])
    await migrate()
    const rev = async (entityId: string, version: number) =>
      (
        await getDb()
          .select()
          .from(revisions)
          .where(
            and(
              eq(revisions.entityType, "settings"),
              eq(revisions.entityId, entityId),
              eq(revisions.version, version)
            )
          )
      )[0].data
    const first = await rev("contact", 1)
    expect(first).toEqual(seededSettings.contact)
    expect(settingsParse("contact", first)).toBeUndefined()
    expect(await rev("contact", 2)).toEqual({
      ...own,
      quoteLabel: "Get a Free Quote",
    })
    expect(await rev("site", 1)).toEqual({ a: 1 })
  })

  it("is a no-op the second time", async () => {
    await insertLegacy()
    const doc = { blocks: blocksFromTemplate("home", legacyHome()) }
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
