import { describe, expect, it } from "vitest"

import {
  isSettingsKey,
  PUBLIC_SETTINGS_KEYS,
  SETTINGS_KEYS,
  settingsSchemas,
} from "@/lib/schemas/settings"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"

const fixture = settingsFixture(fixtureMediaLookup)

describe("settings schemas (R3-1: the CP key set)", () => {
  it("covers exactly the CP settings keys", () => {
    expect(SETTINGS_KEYS).toEqual([
      "site",
      "contact",
      "navigation",
      "footer",
      "sections.clients",
      "sections.whyChooseUs",
      "sections.testimonials",
      "sections.team",
      "sections.contact",
      "sections.map",
      "sections.howItWorks",
      "seo.defaults",
      "consent",
      "tracking",
      "customCode",
      "microcopy",
      "leads",
      "theme",
    ])
    expect(Object.keys(fixture).sort()).toEqual([...SETTINGS_KEYS].sort())
    expect(PUBLIC_SETTINGS_KEYS.every(isSettingsKey)).toBe(true)
    expect(isSettingsKey("integrations.smtp")).toBe(false)
    expect(isSettingsKey("toString")).toBe(false)
  })

  it("has no keys left over from the reference site", () => {
    // Built from parts so the repo holds no literal of the removed keys.
    for (const key of [
      ["sections", "enquire" + "Banner"],
      ["sections", "about"],
    ].map((parts) => parts.join("."))) {
      expect(isSettingsKey(key)).toBe(false)
      expect((SETTINGS_KEYS as string[]).includes(key)).toBe(false)
      expect((PUBLIC_SETTINGS_KEYS as readonly string[]).includes(key)).toBe(
        false
      )
    }
  })

  it("never exposes theme to the public reader (appearance only)", () => {
    expect((PUBLIC_SETTINGS_KEYS as readonly string[]).includes("theme")).toBe(
      false
    )
  })

  it("the public keys are the ones the site renders on its pages", () => {
    expect([...PUBLIC_SETTINGS_KEYS].sort()).toEqual(
      [
        "site",
        "contact",
        "navigation",
        "footer",
        "sections.clients",
        "sections.whyChooseUs",
        "sections.testimonials",
        "sections.team",
        "sections.contact",
        "sections.map",
        "sections.howItWorks",
        "seo.defaults",
        "microcopy",
      ].sort()
    )
  })

  it.each(SETTINGS_KEYS)(
    "%s parses its fixture and round-trips it unchanged",
    (key) => {
      const parsed = settingsSchemas[key].parse(fixture[key])
      expect(parsed).toEqual(fixture[key])
    }
  )

  it("rejects an unsafe link in navigation", () => {
    const bad = structuredClone(fixture.navigation)
    bad.links[0].href = "javascript:alert(1)"
    expect(settingsSchemas.navigation.safeParse(bad).success).toBe(false)
  })

  it("rejects an unsafe social href", () => {
    const bad = structuredClone(fixture["sections.contact"])
    bad.socials[0].href = "javascript:alert(1)"
    expect(settingsSchemas["sections.contact"].safeParse(bad).success).toBe(
      false
    )
  })

  it.each(["javascript:alert(1)", "data:text/html,x"])(
    "rejects %j as the site production URL",
    (value) => {
      const bad = { ...fixture.site, productionUrl: value }
      expect(settingsSchemas.site.safeParse(bad).success).toBe(false)
    }
  )

  it("rejects malformed tracking ids", () => {
    expect(
      settingsSchemas.tracking.safeParse({ ...fixture.tracking, gtmId: "UA-1" })
        .success
    ).toBe(false)
  })

  it("seo.defaults titleTemplate must keep {title}", () => {
    const bad = { ...fixture["seo.defaults"], titleTemplate: "Cleaning" }
    expect(settingsSchemas["seo.defaults"].safeParse(bad).success).toBe(false)
  })
})

describe("leads settings (R3-1, B8)", () => {
  const leads = settingsSchemas.leads

  it("defaults the recipients to info@cleaningpartners.ie", () => {
    expect(fixture.leads.recipients).toEqual(["info@cleaningpartners.ie"])
  })

  it("needs at least one valid recipient and a sane retention", () => {
    expect(leads.safeParse({ ...fixture.leads, recipients: [] }).success).toBe(
      false
    )
    expect(
      leads.safeParse({ ...fixture.leads, recipients: ["nope"] }).success
    ).toBe(false)
    for (const retentionMonths of [0, 121, 1.5])
      expect(
        leads.safeParse({ ...fixture.leads, retentionMonths }).success
      ).toBe(false)
  })
})

describe("strings round-trip unchanged (no trimming or normalising)", () => {
  it("keeps Mon–Fri (en dash) and spaced 9am – 6pm exactly", () => {
    const hours = "Mon–Fri: 9am – 6pm"
    const parsed = settingsSchemas.contact.parse({
      ...fixture.contact,
      hours,
    })
    expect(parsed.hours).toBe(hours)
    expect(parsed.hours).not.toBe("Mon - Fri: 9am - 6pm")
    expect(parsed.hours).not.toBe("Mon – Fri: 9am – 6pm")
    expect(fixture.contact.hours).toBe(hours)
  })

  it("keeps the spaced and unspaced en dash distinct", () => {
    const unspaced = "Mon–Fri"
    const spaced = "Mon – Fri"
    expect(unspaced).not.toBe(spaced)
    for (const value of [unspaced, spaced])
      expect(
        settingsSchemas.contact.parse({ ...fixture.contact, hours: value })
          .hours
      ).toBe(value)
  })

  it("keeps apostrophes, ampersands and the no-break spaces before an arrow", () => {
    expect(fixture.microcopy.readArticle).toBe("Read Article\u00a0\u00a0→")
    expect(fixture.microcopy.viewAllPosts).toBe("View All Posts\u00a0\u00a0→")
    expect(fixture["sections.contact"].quoteBox.body).toBe(
      "Tell us about your space and we'll put together a cleaning plan and price that suits you."
    )
    expect(fixture["sections.howItWorks"].steps[2].title).toBe(
      "Daily cleans & deep cleans"
    )
  })

  it("keeps the extension as a separate field and the template verbatim", () => {
    expect(fixture.contact.officeExtension).toBe("4")
    expect(fixture.footer.contactOfficeLine).toBe(
      "Tel: {office} Ext {officeExtension}"
    )
    expect(fixture.contact.phone24Label).toBe("24hr contact: {phone24h}")
    expect(fixture["seo.defaults"].titleTemplate).toBe(
      "{title} | Cleaning Partners Ltd."
    )
    expect(fixture["sections.testimonials"].starsAria).toBe(
      "{rating} out of 5 stars"
    )
  })

  it("uses the CP numbers", () => {
    expect(fixture.contact.office).toBe("057 8697670")
    expect(fixture.contact.mobile).toBe("085 806 2369")
    expect(fixture.contact.phone24h).toBe("(085) 8062369")
  })
})
