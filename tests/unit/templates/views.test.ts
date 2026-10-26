import { describe, expect, it } from "vitest"

import type { WithMedia } from "@/lib/media"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { aboutView } from "@/templates/about/view"
import { articleView, blogView } from "@/templates/blog/view"
import { contactView } from "@/templates/contact/view"
import { homeView } from "@/templates/home/view"
import { serviceDetailView, servicesView } from "@/templates/services/view"
import {
  articleMetadata,
  pageMetadata,
  serviceMetadata,
  siteMetadata,
} from "@/templates/shared/page-meta"
import type { SiteSources } from "@/templates/shared/sources"

import { frozenModule } from "../helpers/frozen"

const s = fixtureSiteSources()

type FrozenService = {
  slug: string
  title: string
  icon: string
  cover: string
  summary: string
  tags: string[]
  included: string[]
  places: string[]
  overview: string[]
}
type FrozenPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  displayDate: string
  cover: string
  readTime?: string
}
const frozenServices = frozenModule<{ services: FrozenService[] }>(
  "lib/services.ts"
).services
const { blogPosts, blogCategories } = frozenModule<{
  blogPosts: FrozenPost[]
  blogCategories: string[]
}>("lib/blog-posts.ts")

describe("view builders reproduce the static site's data (fixture sources)", () => {
  it("chrome: header, footer, locale", () => {
    const { chrome } = homeView(s)
    expect(chrome.locale).toBe("en")
    expect(chrome.header.topBar).toEqual({
      phone: "24hr contact: (085) 8062369",
      phoneHref: "tel:+353858062369",
      email: "info@cleaningpartners.ie",
      emailHref: "mailto:info@cleaningpartners.ie",
      hours: "Mon–Fri: 9am – 6pm",
    })
    expect(chrome.header.logo).toEqual({
      src: "/images/home/logo.png",
      alt: "Cleaning Partners",
      href: "/",
    })
    expect(chrome.header.cta).toEqual({
      label: "Get a Quote",
      href: "#contact",
    })
    expect(chrome.header.menuAria).toBe("Open menu")
    expect(chrome.header.links).toEqual([
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ])
    expect(chrome.footer.quickLinks.links).toEqual(chrome.header.links)
    expect(chrome.footer.contact.lines).toEqual([
      "Derryguile, Mountmellick",
      "Co. Laois, R32 YX49",
      "Tel: 057 8697670 Ext 4",
      "info@cleaningpartners.ie",
    ])
    expect(chrome.footer.group.companies.map((c) => c.href)).toEqual([
      "https://www.securitypartnersltd.ie",
      "https://www.mjseco.ie",
    ])
    expect(chrome.footer.group.companies.map((c) => c.logo)).toEqual([
      "/images/home/security-partners.png",
      "/images/home/mjs-eco.png",
    ])
    expect(chrome.footer.legal).toEqual({
      privacy: { label: "Privacy Policy", href: "/privacy" },
      terms: { label: "Terms", href: "/terms" },
    })
    expect(chrome.footer.copyright).toBe(
      "© 2026 Cleaning Partners Ltd. All rights reserved."
    )
  })

  it("home: hero, services intro and the 3 posts after the featured one", () => {
    const view = homeView(s)
    expect(view.hero.background).toBe("/images/home/hero.png")
    expect(view.hero.logo).toEqual({
      src: "/images/home/cleaning-partners-logo.png",
      alt: "Cleaning Partners",
    })
    expect(view.hero.member).toEqual({
      label: "Proud member of",
      logo: "/images/home/icca.png",
      logoAlt: "Irish Contract Cleaning Association",
    })
    expect(view.services.items).toHaveLength(3)
    expect(view.services.itemIcon).toBe("/images/home/check.svg")
    expect(view.blog.posts.map((p) => p.slug)).toEqual(
      blogPosts.slice(1, 4).map((p) => p.slug)
    )
    expect(view.blog.viewAll.label).toBe("View All Posts  →")
    expect(view.clients.clients.map((c) => c.name)).toEqual([
      "HSE",
      "Department of Education",
      "IDS",
      "Martin Reddin",
      "Ortus",
      "OPW",
      "ALS Life Sciences",
    ])
    expect(view.testimonials.items[0]).toMatchObject({
      initials: "TM",
      stars: "★★★★★",
      starsAria: "5 out of 5 stars",
    })
    expect(view.team.members).toHaveLength(3)
    expect(view.team.members[0].photo).toEqual({
      src: "/images/home/team-temp.png",
      placeholder: true,
    })
    expect(view.contact.cards[0].lines).toEqual([
      "Tel: 057 8697670 Ext 4",
      "Mobile: 085 806 2369",
      "24hr contact: (085) 8062369",
    ])
    expect(view.contact.title).toBe("Contact Us")
    expect(view.map.tilePattern).toBe("/images/home/tiles/tile-{index}.png")
    expect(view.map.logo).toBe("/images/home/logo.png")
  })

  it("about: story paragraphs, sectors and stats", () => {
    const view = aboutView(s)
    expect(view.hero.title).toBe("About Us")
    expect(view.hero.image).toBe("/images/home/hero.png")
    expect(view.story.paragraphs.content).toHaveLength(3)
    expect(view.story.sectors).toEqual([
      "HSE",
      "County Council",
      "Retail",
      "Commercial",
      "Residential",
    ])
    expect(view.stats.stats.map((x) => x.value)).toEqual([
      "15+",
      "5",
      "24hr",
      "Nationwide",
    ])
    expect(view.stats.stats[2].label).toBe("Contact line: (085) 8062369")
  })

  it("contact: hero, ways-to-reach-us title and the form copy", () => {
    const view = contactView(s)
    expect(view.contact.title).toBe("Ways to Reach Us")
    expect(view.form.urgent.phone).toBe("24hr contact: (085) 8062369")
    expect(view.form.urgent.phoneHref).toBe("tel:+353858062369")
    expect(view.form.email).toBe("info@cleaningpartners.ie")
    expect(view.form.fields.service.options).toEqual([
      ...frozenServices.map((x) => x.title),
      "Domestic Cleaning",
      "Other",
    ])
    expect(view.form).not.toHaveProperty("mailSubject")
    expect(view.form.fields.service).not.toHaveProperty("fallback")
    expect(view.form.sentMessage).toBe(
      "Thanks, we've received your request and will be in touch shortly. You can also email us at {email}."
    )
    expect(view.form.sendingLabel).toBe("Sending…")
    expect(view.form.errorMessage).toBe(
      "Something went wrong. Please try again, or call us."
    )
    expect(view.form.rateLimitedMessage).toBe(
      "Too many attempts. Please try again in a few minutes."
    )
    expect(view.map.href).toContain("google.com/maps")
  })

  it("services: cards equal lib/services.ts, help card interpolates the office", () => {
    const view = servicesView(s)
    expect(view.grid.services).toEqual(
      frozenServices.map((x) => ({
        slug: x.slug,
        href: `/services/${x.slug}`,
        title: x.title,
        icon: x.icon,
        summary: x.summary,
        tags: x.tags,
        learnMoreAria: `Learn more about ${x.title}`,
      }))
    )
    expect(view.grid.learnMore).toBe("Learn More  →")
    expect(view.grid.helpCard.call).toEqual({
      label: "Or call 057 8697670 Ext 4",
      href: "tel:+353578697670",
    })
    expect(view.hero.image).toBe("/images/home/cleaning-the-counter.png")
  })

  it("service detail: breadcrumb trail, nav, overview paragraphs, office hours", () => {
    const view = serviceDetailView(s, "medical-cleaning")!
    expect(view.hero.parents).toEqual([
      { label: "Services", href: "/services" },
    ])
    expect(view.hero.image).toBe("/images/home/cleaning-the-counter.png")
    expect(view.overview.service.overview.content).toHaveLength(2)
    expect(view.overview.nav.items.map((i) => i.href)).toEqual(
      frozenServices.map((x) => `/services/${x.slug}`)
    )
    expect(view.overview.nav.activeSlug).toBe("medical-cleaning")
    expect(view.overview.quoteCard.tel).toEqual({
      label: "Tel: 057 8697670 Ext 4",
      href: "tel:+353578697670",
    })
    expect(view.overview.officeHours).toEqual({
      title: "Office Hours",
      hours: "Mon – Fri: 9am – 6pm",
      phone: "24hr contact: (085) 8062369",
      phoneHref: "tel:+353858062369",
    })
    expect(serviceDetailView(s, "no-such-service")).toBeNull()
  })

  it("blog: featured is the newest, every category filters, page size 6", () => {
    const view = blogView(s)
    expect(view.posts.featured?.slug).toBe(blogPosts[0].slug)
    expect(view.posts.posts.map((p) => p.slug)).toEqual(
      blogPosts.map((p) => p.slug)
    )
    expect(view.posts.posts[2]).toMatchObject({
      date: "2026-09-02",
      displayDate: "02 Sep 2026",
      readTime: null,
    })
    expect(view.posts.posts[1].readTime).toBe("5 min read")
    expect(view.posts.categories).toEqual(blogCategories)
    expect(view.posts.pageSize).toBe(6)
    expect(view.posts.labels.all).toBe("All Posts")
    expect(view.hero.image).toBe("/images/home/vacuuming.png")
  })

  it("article: header fallbacks, body, sidebar and related posts", () => {
    const signs = articleView(
      s,
      "5-signs-your-office-needs-a-professional-clean"
    )!
    expect(signs.header.article).toMatchObject({
      category: "Commercial",
      categoryHref: "/blog?category=Commercial",
      date: "2026-09-15",
      displayDate: "15 Sep 2026",
      readTime: "5 min read",
      author: "The Clean Team",
    })
    expect(signs.header.breadcrumb).toMatchObject({
      home: { label: "Home", href: "/" },
      blog: { label: "Blog", href: "/blog" },
    })
    expect(signs.body.tags.items).toEqual([
      "Commercial",
      "Office Cleaning",
      "Tips",
    ])
    expect(signs.body.body.content).toHaveLength(15)
    expect(signs.body.recent.posts.map((p) => p.slug)).toEqual(
      blogPosts
        .filter((p) => p.slug !== signs.header.article.slug)
        .slice(0, 3)
        .map((p) => p.slug)
    )
    expect(signs.body.categories.items.map((c) => c.name)).toEqual(
      blogCategories
    )
    expect(signs.body.categories.items.map((c) => c.active)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
    ])
    expect(signs.related.posts.map((p) => p.slug)).toEqual([
      "deep-cleaning-vs-regular-cleaning-what-your-business-needs",
      "infection-control-cleaning-in-healthcare-settings",
      "how-to-get-stubborn-stains-out-of-curtains",
    ])
    expect(signs.body.share.networks.map((n) => n.name)).toEqual([
      "Facebook",
      "LinkedIn",
      "X",
    ])

    // No designed body: the excerpt is the lead paragraph, the category the tag.
    const plain = articleView(
      s,
      "infection-control-cleaning-in-healthcare-settings"
    )!
    expect(plain.header.article.readTime).toBeNull()
    expect(plain.body.tags.items).toEqual(["Medical"])
    expect(plain.body.body.content).toEqual([
      {
        type: "paragraph",
        attrs: { variant: "lead" },
        content: [{ type: "text", text: blogPosts[2].excerpt }],
      },
    ])
    expect(articleView(s, "no-such-article")).toBeNull()
  })

  it("metadata matches the static site's titles and descriptions", () => {
    expect(pageMetadata(s, "home")).toMatchObject({
      title: "Cleaning Partners Ltd. | The Clean Team",
      description:
        "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
      alternates: { canonical: "/" },
    })
    expect(pageMetadata(s, "about").title).toBe(
      "About Us | Cleaning Partners Ltd."
    )
    expect(pageMetadata(s, "contact").description).toBe(
      "Get in touch with the Clean Team for a free, no-obligation quote. 24hr contact: (085) 8062369."
    )
    expect(serviceMetadata(s, "medical-cleaning")).toMatchObject({
      title: "Medical Cleaning | Cleaning Partners Ltd.",
      description:
        "Hygienic, high-standard cleaning for hospitals, HSE health centres, primary care centres and GP clinics.",
    })
    const article = articleMetadata(
      s,
      "5-signs-your-office-needs-a-professional-clean"
    )
    expect(article).toMatchObject({
      title:
        "5 Signs Your Office Needs a Professional Clean | Cleaning Partners Ltd.",
      description:
        "From dusty vents to tired carpets: what to look out for, and how often to book a deep clean.",
    })
    expect(article.openGraph).toMatchObject({ type: "article" })
    expect(serviceMetadata(s, "nope")).toEqual({})
    expect(articleMetadata(s, "nope")).toEqual({})
    expect(
      String(siteMetadata(s, "https://cleaningpartners.ie").metadataBase)
    ).toBe("https://cleaningpartners.ie/")
  })
})

describe("chrome logo animation", () => {
  it("is absent unless settings.site.logoAnimation is set", () => {
    const { chrome } = homeView(s)
    expect(chrome.header.logo).not.toHaveProperty("animation")
    expect(chrome.footer.logo).not.toHaveProperty("animation")
  })

  it("reaches the header and footer logos when set", () => {
    const animated: SiteSources = {
      ...s,
      settings: {
        ...s.settings,
        site: {
          ...s.settings.site,
          logoAnimation: {
            ...s.settings.site.logo,
            url: "/api/v1/media/file/a.json",
          },
        },
      },
    }
    const { chrome } = homeView(animated)
    expect(chrome.header.logo.animation).toBe("/api/v1/media/file/a.json")
    expect(chrome.footer.logo.animation).toBe("/api/v1/media/file/a.json")
  })
})

describe("views never depend on media dimensions", () => {
  /** The same sources as a database would give them: every image has real dimensions. */
  function withDimensions(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(withDimensions)
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const record = value as Record<string, unknown>
      if (typeof record.url === "string" && "blurDataUrl" in record)
        return { ...record, width: 720, height: 1047, blurDataUrl: "data:x" }
      return Object.fromEntries(
        Object.entries(record).map(([k, v]) => [k, withDimensions(v)])
      )
    }
    return value
  }
  const db = withDimensions(s) as SiteSources

  it("every view is identical for fixture media (null dimensions) and database media", () => {
    expect(homeView(db)).toEqual(homeView(s))
    expect(aboutView(db)).toEqual(aboutView(s))
    expect(servicesView(db)).toEqual(servicesView(s))
    expect(contactView(db)).toEqual(contactView(s))
    expect(blogView(db)).toEqual(blogView(s))
    expect(serviceDetailView(db, "retail-cleaning")).toEqual(
      serviceDetailView(s, "retail-cleaning")
    )
    expect(articleView(db, blogPosts[1].slug)).toEqual(
      articleView(s, blogPosts[1].slug)
    )
  })

  it("the fixture sources really differ from the database ones", () => {
    expect(JSON.stringify(db)).toContain('"width":720')
    expect(JSON.stringify(s)).not.toContain('"width":720')
    const media: WithMedia<{ m: { mediaId: string } }>["m"] =
      s.settings.site.logo
    expect(media.width).toBeNull()
  })
})
