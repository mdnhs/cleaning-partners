import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { and, eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { BlockInstance } from "@/blocks/registry"
import { settingsSchemas } from "@/lib/schemas/settings"
import { getDb } from "@/server/db/client"
import {
  builderPages,
  media,
  mediaUsages,
  pages,
  revisions,
  settings,
} from "@/server/db/schema"
import {
  fixtureMediaId,
  fixtureMediaLookup,
} from "@/server/db/seed/fixtures/media"
import { pagesFixture } from "@/server/db/seed/fixtures/pages"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"
import { blocksFromTemplate } from "@/templates/builder/from-template"
import type { HomeTemplate } from "@/templates/home/schema"
import { PAGES, templates } from "@/templates/registry"

import { resetDb } from "../db"

const DIR = "server/db/migrations"
const file = readdirSync(DIR).find((f) => f.endsWith("_site_membership.sql"))!
const statements = readFileSync(join(DIR, file), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)

const seededSettings = settingsFixture(fixtureMediaLookup)
const seededHome = pagesFixture(fixtureMediaLookup).home.data
const siteSchema = settingsSchemas.site
const contactSchema = settingsSchemas["sections.contact"]
const homeSchema = templates[PAGES.home].schema

const ICCA = fixtureMediaId("/images/home/icca.png")
const ICCA_MEMBER = "0b1c2d3e-4f50-4a61-8b72-9c83d4e5f601"
const OWN = "0b1c2d3e-4f50-4a61-8b72-9c83d4e5f602"
const FULL_NAME = "Irish Contract Cleaning Association"
const SEEDED_MEMBERSHIP = {
  logo: { mediaId: ICCA },
  logoAlt: FULL_NAME,
  name: FULL_NAME,
}

type Obj = Record<string, unknown>

/** settings.site as stored before 0039: no `membership`. */
const legacySite = (): Obj => {
  const { membership, ...site } = seededSettings.site
  void membership
  return site
}
/** sections.contact as stored before 0039: its own logo, alt and subtitle. */
const legacyContact = (over: Obj = {}): Obj => ({
  ...seededSettings["sections.contact"],
  memberLogo: { mediaId: ICCA_MEMBER },
  memberLogoAlt: "ICCA",
  memberSubtitle: FULL_NAME,
  ...over,
})
/** The home page as stored before 0039: the hero holds the logo and alt. */
const legacyHome = (hero: Obj = {}): Obj => ({
  ...seededHome,
  hero: {
    ...seededHome.hero,
    memberLogo: { mediaId: ICCA },
    memberLogoAlt: FULL_NAME,
    ...hero,
  },
})

/** One transaction = one connection, so the pg_temp helper stays visible. */
async function migrate() {
  await getDb().transaction(async (tx) => {
    for (const statement of statements) await tx.execute(sql.raw(statement))
  })
}

const setting = async (key: string) =>
  (await getDb().select().from(settings).where(eq(settings.key, key)))[0]
const home = async () =>
  (await getDb().select().from(pages).where(eq(pages.key, "home")))[0]

async function insertAll({
  site = [legacySite(), legacySite()],
  contact = [legacyContact(), legacyContact()],
  homePage = [legacyHome(), legacyHome()],
}: {
  site?: [unknown, unknown]
  contact?: [unknown, unknown]
  homePage?: [unknown, unknown]
} = {}) {
  const db = getDb()
  await db.insert(settings).values([
    { key: "site", draft: site[0], published: site[1] },
    { key: "sections.contact", draft: contact[0], published: contact[1] },
  ])
  await db.insert(pages).values({
    key: "home",
    template: PAGES.home,
    draft: homePage[0],
    published: homePage[1],
  })
}

const membershipOf = (value: unknown) => (value as Obj).membership
const heroOf = (value: unknown) => (value as { hero: Obj }).hero
const OLD_CONTACT_KEYS = ["memberLogo", "memberLogoAlt", "memberSubtitle"]

beforeEach(resetDb)

describe("site_membership (custom data migration)", () => {
  it("moves the seeded badge to settings.site.membership, in draft and published", async () => {
    await insertAll()
    await migrate()

    const site = await setting("site")
    expect(membershipOf(site.draft)).toEqual(SEEDED_MEMBERSHIP)
    expect(membershipOf(site.published)).toEqual(SEEDED_MEMBERSHIP)
    expect(siteSchema.parse(site.draft)).toEqual(seededSettings.site)
    expect(siteSchema.parse(site.published)).toEqual(seededSettings.site)

    const contact = await setting("sections.contact")
    for (const value of [contact.draft, contact.published]) {
      for (const key of OLD_CONTACT_KEYS) expect(value).not.toHaveProperty(key)
      expect(value).toHaveProperty("memberTitle", "Member of the ICCA")
      expect(contactSchema.parse(value)).toEqual(
        seededSettings["sections.contact"]
      )
    }

    const page = await home()
    for (const value of [page.draft, page.published]) {
      expect(heroOf(value)).not.toHaveProperty("memberLogo")
      expect(heroOf(value)).not.toHaveProperty("memberLogoAlt")
      expect(heroOf(value)).toHaveProperty("memberLabel", "Proud member of")
      expect(homeSchema.parse(value)).toEqual(homeSchema.parse(seededHome))
    }
  })

  it("carries admin-edited values over verbatim", async () => {
    await insertAll({
      homePage: [
        legacyHome({
          memberLogo: { mediaId: OWN },
          memberLogoAlt: "Our badge",
        }),
        legacyHome(),
      ],
      contact: [
        legacyContact({ memberSubtitle: "Proud ICCA member" }),
        legacyContact(),
      ],
    })
    await migrate()
    const site = await setting("site")
    expect(membershipOf(site.draft)).toEqual({
      logo: { mediaId: OWN },
      logoAlt: "Our badge",
      name: "Proud ICCA member",
    })
    expect(membershipOf(site.published)).toEqual(SEEDED_MEMBERSHIP)
    expect(siteSchema.safeParse(site.draft).success).toBe(true)
  })

  it("falls back to the contact section's logo and to the hero alt for the name", async () => {
    const { memberLogo, memberLogoAlt, ...hero } = heroOf(legacyHome())
    void memberLogo
    void memberLogoAlt
    const { memberSubtitle, ...contact } = legacyContact()
    void memberSubtitle
    await insertAll({
      homePage: [{ ...seededHome, hero }, legacyHome({ memberLogoAlt: "Alt" })],
      contact: [legacyContact(), contact],
    })
    await migrate()
    const site = await setting("site")
    expect(membershipOf(site.draft)).toEqual({
      logo: { mediaId: ICCA_MEMBER },
      logoAlt: "ICCA",
      name: FULL_NAME,
    })
    expect(membershipOf(site.published)).toEqual({
      logo: { mediaId: ICCA },
      logoAlt: "Alt",
      name: "Alt",
    })
  })

  it("keeps a membership the site already has (and still drops the old keys)", async () => {
    const own = { logo: { mediaId: OWN }, logoAlt: "Kept", name: "Kept name" }
    await insertAll({
      site: [
        { ...legacySite(), membership: own },
        { ...legacySite(), membership: own },
      ],
    })
    await migrate()
    const site = await setting("site")
    expect(membershipOf(site.draft)).toEqual(own)
    expect(membershipOf(site.published)).toEqual(own)
    expect(heroOf((await home()).draft)).not.toHaveProperty("memberLogo")
    const contact = await setting("sections.contact")
    expect(contact.draft).not.toHaveProperty("memberSubtitle")
  })

  it("keeps a NULL published and is safe to re-run", async () => {
    await insertAll({
      site: [legacySite(), null as unknown],
      contact: [legacyContact(), null as unknown],
      homePage: [legacyHome(), null as unknown],
    })
    await migrate()
    const once = {
      site: await setting("site"),
      contact: await setting("sections.contact"),
      home: await home(),
    }
    await migrate()
    const twice = {
      site: await setting("site"),
      contact: await setting("sections.contact"),
      home: await home(),
    }
    expect(twice.site.published).toBeNull()
    expect(twice.contact.published).toBeNull()
    expect(twice.home.published).toBeNull()
    expect(twice.site.draft).toEqual(once.site.draft)
    expect(twice.contact.draft).toEqual(once.contact.draft)
    expect(twice.home.draft).toEqual(once.home.draft)
    expect(membershipOf(twice.site.draft)).toEqual(SEEDED_MEMBERSHIP)
  })

  it("a published site without published sources takes the draft's membership", async () => {
    await insertAll({
      contact: [legacyContact(), null as unknown],
      homePage: [legacyHome(), null as unknown],
    })
    await migrate()
    const site = await setting("site")
    expect(membershipOf(site.published)).toEqual(SEEDED_MEMBERSHIP)
    expect(siteSchema.safeParse(site.published).success).toBe(true)
  })

  it("strips the logo from builder hero blocks copied from Home and bumps their version", async () => {
    await insertAll()
    const blocks = blocksFromTemplate(
      "home",
      legacyHome({ memberLogoAlt: "Copied alt" }) as unknown as HomeTemplate
    )
    const doc = { blocks }
    const other = {
      blocks: blocksFromTemplate(
        "about",
        pagesFixture(fixtureMediaLookup).about.data
      ),
    }
    await getDb()
      .insert(builderPages)
      .values([
        { slug: "copy", title: "Copy", draft: doc, published: doc },
        { slug: "draft-only", title: "Draft", draft: doc, published: null },
        { slug: "about", title: "About", draft: other, published: other },
      ])
    await migrate()
    await migrate()

    const rows = await getDb().select().from(builderPages)
    const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]))
    expect(bySlug.copy.version).toBe(2)
    expect(bySlug["draft-only"].version).toBe(2)
    expect(bySlug["draft-only"].published).toBeNull()
    expect(bySlug.about.version).toBe(1)
    expect(bySlug.about.draft).toEqual(other)

    for (const value of [
      bySlug.copy.draft,
      bySlug.copy.published,
      bySlug["draft-only"].draft,
    ]) {
      const after = (value as typeof doc).blocks
      expect(after.map((b) => b.type)).toEqual(blocks.map((b) => b.type))
      const hero = after.find((b) => b.type === "hero")!
      expect(hero.data).not.toHaveProperty("memberLogo")
      expect(hero.data).not.toHaveProperty("memberLogoAlt")
      // Every other value is carried over verbatim.
      const { memberLogo, memberLogoAlt, ...rest } = blocks[0].data as Obj
      void memberLogo
      void memberLogoAlt
      expect(hero.data).toEqual(rest)
      expect(after.slice(1)).toEqual(blocks.slice(1))
      for (const block of after)
        expect(BlockInstance.safeParse(block).success, block.type).toBe(true)
    }
  })

  it("moves the media usages to settings.site membership.logo", async () => {
    const db = getDb()
    await db.insert(media).values(
      [ICCA, ICCA_MEMBER, OWN].map((id, i) => ({
        id,
        key: `/images/membership-${i}.png`,
        driver: "static" as const,
        mime: "image/png",
        size: 1,
      }))
    )
    await insertAll({
      homePage: [legacyHome(), legacyHome({ memberLogo: { mediaId: OWN } })],
    })
    const [page] = await db
      .insert(builderPages)
      .values({ slug: "copy", title: "Copy", draft: { blocks: [] } })
      .returning()
    const usage = (
      entityType: string,
      entityId: string,
      field: string,
      mediaId: string
    ) => ({
      mediaId,
      entityType,
      entityId,
      field,
    })
    await db
      .insert(mediaUsages)
      .values([
        usage("page", "home", "hero.memberLogo", ICCA),
        usage("page", "home", "hero.memberLogo", OWN),
        usage("page", "home", "hero.background", OWN),
        usage("settings", "sections.contact", "memberLogo", ICCA_MEMBER),
        usage("settings", "sections.contact", "infoCards.0.icon", OWN),
        usage("builder-page", page.id, "blocks.0.data.memberLogo", ICCA),
        usage("builder-page", page.id, "blocks.10.data.memberLogo", ICCA),
        usage("builder-page", page.id, "blocks.0.data.background", OWN),
        usage("builder-page", page.id, "blocks.0.data.memberLogoX", OWN),
      ])
    await migrate()
    await migrate()

    const rows = await db
      .select({
        mediaId: mediaUsages.mediaId,
        entityType: mediaUsages.entityType,
        entityId: mediaUsages.entityId,
        field: mediaUsages.field,
      })
      .from(mediaUsages)
    const key = (u: (typeof rows)[number]) =>
      `${u.entityType}:${u.entityId}:${u.field}:${u.mediaId}`
    expect(rows.map(key).sort()).toEqual(
      [
        usage("page", "home", "hero.background", OWN),
        usage("settings", "sections.contact", "infoCards.0.icon", OWN),
        usage("builder-page", page.id, "blocks.0.data.background", OWN),
        usage("builder-page", page.id, "blocks.0.data.memberLogoX", OWN),
        // draft from the hero, published from the hero's own logo
        usage("settings", "site", "membership.logo", ICCA),
        usage("settings", "site", "membership.logo", OWN),
      ]
        .map(key)
        .sort()
    )
  })

  it("adds the membership to the site's revisions only", async () => {
    await insertAll()
    const own = { logo: { mediaId: OWN }, logoAlt: "Old", name: "Old name" }
    await getDb()
      .insert(revisions)
      .values([
        {
          entityType: "settings",
          entityId: "site",
          version: 1,
          data: legacySite(),
        },
        {
          entityType: "settings",
          entityId: "site",
          version: 2,
          data: { ...legacySite(), membership: own },
        },
        {
          entityType: "settings",
          entityId: "footer",
          version: 1,
          data: { a: 1 },
        },
        { entityType: "page", entityId: "site", version: 1, data: { a: 1 } },
      ])
    await migrate()
    await migrate()
    const rev = async (entityType: string, entityId: string, version: number) =>
      (
        await getDb()
          .select()
          .from(revisions)
          .where(
            and(
              eq(revisions.entityType, entityType),
              eq(revisions.entityId, entityId),
              eq(revisions.version, version)
            )
          )
      )[0].data
    const first = await rev("settings", "site", 1)
    expect(membershipOf(first)).toEqual(SEEDED_MEMBERSHIP)
    expect(siteSchema.safeParse(first).success).toBe(true)
    expect(membershipOf(await rev("settings", "site", 2))).toEqual(own)
    expect(await rev("settings", "footer", 1)).toEqual({ a: 1 })
    expect(await rev("page", "site", 1)).toEqual({ a: 1 })
  })
})
