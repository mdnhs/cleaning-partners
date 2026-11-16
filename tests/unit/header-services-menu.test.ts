import { describe, expect, it } from "vitest"

import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { chromeView } from "@/templates/shared/views"

describe("chromeView Services menu", () => {
  it("gives the Services header link one child per published service", () => {
    const s = fixtureSiteSources()
    const { header } = chromeView(s)
    const services = header.links.find((l) => l.href === "/services")!
    expect(services.children).toEqual(
      s.services.map((x) => ({
        label: x.content.title,
        href: `/services/${x.slug}`,
        icon: x.content.icon.url,
      }))
    )
    for (const child of services.children!) expect(child.icon).toBeTruthy()
    expect(services.children!.length).toBeGreaterThan(0)
  })

  it("other header links, the footer links and the CTA carry no children", () => {
    const { header, footer } = chromeView(fixtureSiteSources())
    for (const link of header.links.filter((l) => l.href !== "/services"))
      expect(Object.keys(link)).not.toContain("children")
    for (const link of footer.quickLinks.links)
      expect(Object.keys(link)).not.toContain("children")
    expect(Object.keys(header.cta)).not.toContain("children")
  })

  it("no services → no children key at all (the page payload stays as before)", () => {
    const s = { ...fixtureSiteSources(), services: [] }
    const { header } = chromeView(s)
    const services = header.links.find((l) => l.href === "/services")!
    expect(Object.keys(services)).not.toContain("children")
  })

  it("a link with its own dropdown keeps it, on any link", () => {
    const s = fixtureSiteSources()
    const links = s.settings.navigation.links.map((l) =>
      l.href === "/about"
        ? { ...l, children: [{ label: "Our team", href: "/about#team" }] }
        : l
    )
    const { header } = chromeView({
      ...s,
      settings: {
        ...s.settings,
        navigation: { ...s.settings.navigation, links },
      },
    })
    const about = header.links.find((l) => l.href === "/about")!
    expect(about.children).toEqual([{ label: "Our team", href: "/about#team" }])
  })

  it("its own dropdown on Services replaces the automatic list", () => {
    const s = fixtureSiteSources()
    const links = s.settings.navigation.links.map((l) =>
      l.href === "/services"
        ? { ...l, children: [{ label: "Pricing", href: "/contact" }] }
        : l
    )
    const { header } = chromeView({
      ...s,
      settings: {
        ...s.settings,
        navigation: { ...s.settings.navigation, links },
      },
    })
    const services = header.links.find((l) => l.href === "/services")!
    expect(services.children).toEqual([{ label: "Pricing", href: "/contact" }])
  })

  it("inFooter off keeps a link out of the footer's Quick links only", () => {
    const s = fixtureSiteSources()
    const links = s.settings.navigation.links.map((l) =>
      l.href === "/blog" ? { ...l, inFooter: false } : l
    )
    const { header, footer } = chromeView({
      ...s,
      settings: {
        ...s.settings,
        navigation: { ...s.settings.navigation, links },
      },
    })
    expect(header.links.map((l) => l.href)).toContain("/blog")
    expect(footer.quickLinks.links.map((l) => l.href)).not.toContain("/blog")
  })

  it("rows saved before children/inFooter existed still render (header and footer)", () => {
    const s = fixtureSiteSources()
    // The stored JSON of an older row: the two new fields are absent.
    const links = s.settings.navigation.links.map(({ label, href }) => ({
      label,
      href,
    })) as unknown as typeof s.settings.navigation.links
    const { header, footer } = chromeView({
      ...s,
      settings: {
        ...s.settings,
        navigation: { ...s.settings.navigation, links },
      },
    })
    expect(header.links.map((l) => l.href)).toEqual(links.map((l) => l.href))
    expect(footer.quickLinks.links.map((l) => l.href)).toEqual(
      links.map((l) => l.href)
    )
    expect(
      header.links.find((l) => l.href === "/services")!.children?.length
    ).toBeGreaterThan(0)
  })
})
