import { navigationMobileDefaults } from "@/lib/schemas/settings/navigation"
import {
  type ContactCardKind,
  contactMobileDefaults,
} from "@/lib/schemas/settings/sections-contact"
import type { StatsProps } from "@/components/about/stats"
import type { OurStoryProps } from "@/components/about/our-story"
import type { ArticleBodyProps } from "@/components/blog/article"
import type { PostCardData } from "@/components/blog/post-card"
import type { QuoteFormProps } from "@/components/contact/quote-form"
import type { BlogProps } from "@/components/home/blog"
import type { ClientsProps } from "@/components/home/clients"
import type { ContactProps } from "@/components/home/contact"
import type { HeroProps } from "@/components/home/hero"
import type { LocationMapProps } from "@/components/home/location-map"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { QuoteCardProps } from "@/components/home/quote-card"
import type { ServicesProps } from "@/components/home/services"
import type { SiteFooterProps } from "@/components/home/site-footer"
import type { SiteHeaderProps } from "@/components/home/site-header"
import type { TeamProps } from "@/components/home/team"
import type { TestimonialsProps } from "@/components/home/testimonials"
import type { StepsSectionProps } from "@/components/home/steps-section"
import type { IconCardsSectionProps } from "@/components/home/icon-cards-section"
import type { ServicesGridProps } from "@/components/services/services-grid"
import { formatPostDate, isoDate, siteLocale, siteTimeZone } from "@/lib/format"
import {
  contactPlaceholders,
  interpolate,
  interpolateHref,
} from "@/lib/interpolate"
import type { MediaView, WithMedia } from "@/lib/media"
import type {
  IconCardsSectionData,
  Link,
  PageHero,
  QuoteCardOverrides,
  StepsSectionData,
} from "@/lib/schemas/common"

import type {
  ChromeSources,
  NotFoundSources,
  SiteArticle,
  SiteSources,
} from "./sources"

/** Anything that carries settings.contact (the {placeholders} source). */
type WithContact = { settings: Pick<SiteSources["settings"], "contact"> }

type Pages = SiteSources["pages"]

// Builders shared by several templates: header, footer, the shared sections
// and the card shapes. Pure functions of SiteSources. They hand the
// components strings only (urls, text, hrefs), never a media row, so the
// pages render the same whatever dimensions the media rows carry.

/** Settings.contact fields + derived tel: hrefs for {placeholders}. */
export const placeholders = (s: WithContact) =>
  contactPlaceholders(s.settings.contact)

/**
 * An admin-editable href: {placeholders} filled, then re-checked; an unsafe
 * or unresolved result renders "#".
 */
export const hrefView = (s: WithContact, href: string) =>
  interpolateHref(href, placeholders(s))

/** A stored { label, href } link with its label and href filled in. */
export const linkView = (
  s: Pick<ChromeSources, "settings">,
  link: Link
): Link => ({
  label: interpolate(link.label, placeholders(s)),
  href: hrefView(s, link.href),
})

/** A stored text with {placeholders} filled in. */
export const textView = (s: WithContact, text: string) =>
  interpolate(text, placeholders(s))

export type ChromeView = {
  header: SiteHeaderProps
  footer: SiteFooterProps
  /** <html lang> (settings.site.locale), applied by SiteLocale. */
  locale: string
}

export function chromeView(s: ChromeSources): ChromeView {
  const { site, contact, navigation, footer } = s.settings
  const values = placeholders(s)
  // A link with its own dropdown (settings.navigation) keeps it; otherwise
  // Services gets a hover list of the published services (one link per
  // service page). The footer's Quick links are the plain links that are
  // not switched off there.
  const headerLinks = navigation.links.map((stored) => {
    const link = linkView(s, stored)
    if (stored.children.length > 0)
      return { ...link, children: stored.children.map((c) => linkView(s, c)) }
    return link.href === "/services" && s.services.length > 0
      ? {
          ...link,
          children: s.services.map((x) => ({
            label: x.content.title,
            href: `/services/${x.slug}`,
            icon: x.content.icon.url,
          })),
        }
      : link
  })
  const links = navigation.links
    .filter((l) => l.inFooter)
    .map((l) => linkView(s, l))
  // `animation` only when set: without one the props are exactly what they
  // were before the field existed.
  const animation = site.logoAnimation
    ? { animation: site.logoAnimation.url }
    : {}
  const mapsHref = mapsSearchHref(contact)
  return {
    locale: site.locale,
    header: {
      topBar: {
        phone: interpolate(contact.phone24Label, values),
        phoneHref: String(values.phone24hHref),
        email: contact.email,
        emailHref: `mailto:${contact.email}`,
        hours: contact.hours,
      },
      logo: {
        src: site.logo.url,
        alt: site.logoAlt,
        href: hrefView(s, navigation.breadcrumbHomeHref),
        ...animation,
      },
      links: headerLinks,
      cta: linkView(s, navigation.cta),
      menuAria: navigation.menuAria,
      closeMenuAria: navigation.closeMenuAria,
      mobile: navigation.mobile ?? navigationMobileDefaults,
    },
    footer: {
      logo: { src: site.logo.url, alt: site.logoAlt, ...animation },
      tagline: footer.tagline,
      quickLinks: { title: footer.quickLinksTitle, links },
      contact: {
        title: footer.contactTitle,
        lines: [
          contact.addressLine1,
          contact.addressLine2,
          interpolate(footer.contactOfficeLine, values),
          contact.email,
        ],
        // One destination per line (null = plain text): both address lines
        // open the place on a map, the phone line dials, the email composes.
        hrefs: [
          mapsHref,
          mapsHref,
          String(values.officeHref),
          `mailto:${contact.email}`,
        ],
      },
      group: {
        title: footer.groupTitle,
        companies: s.groupCompanies.map((g) => ({
          name: g.name,
          phone: g.phone,
          site: g.site,
          href: `https://${g.site}`,
          logo: g.logo.url,
        })),
      },
      copyright: footer.copyright,
      legal: {
        pages: s.legalLinks ?? [],
        ...(footer.loginLink ? { login: linkView(s, footer.loginLink) } : {}),
      },
    },
  }
}

/**
 * The inner-page hero. A hero without its own banner (image null, or no
 * image key as the 404 copy) uses the site's default hero image.
 */
export function pageHeroView(
  s: NotFoundSources,
  hero: Omit<WithMedia<PageHero>, "image"> & {
    image?: WithMedia<PageHero>["image"]
  },
  parents: PageHeroProps["parents"] = []
): PageHeroProps {
  const { navigation, microcopy, site } = s.settings
  return {
    image: (hero.image ?? site.defaultHeroImage).url,
    crumb: textView(s, hero.crumb),
    parents,
    title: textView(s, hero.title),
    description: textView(s, hero.description),
    home: {
      label: navigation.breadcrumbHome,
      href: hrefView(s, navigation.breadcrumbHomeHref),
    },
    ariaLabel: microcopy.breadcrumbAria,
  }
}

/** What the 404 page shows: a page hero plus a button back home. */
type NotFoundViewSettings = NotFoundSources["settings"]["microcopy"]["notFound"]

export type NotFoundViewProps = PageHeroProps & { homeLabel: string }

/**
 * The 404 page's copy when settings cannot be read (the database is down).
 * Kept equal to the seeded settings.microcopy.notFound (a unit test checks).
 */
export const NOT_FOUND_FALLBACK: NotFoundViewProps = {
  image: "/images/home/hero.png",
  crumb: "Not found",
  parents: [],
  title: "Page not found",
  description: "The page you are looking for has moved or no longer exists.",
  home: { label: "Home", href: "/" },
  ariaLabel: "Breadcrumb",
  homeLabel: "Back to home",
}

/** The 404 page: settings.microcopy.notFound on the default banner. */
export function notFoundView(s: NotFoundSources): NotFoundViewProps {
  // Settings saved before migration 0034 have no notFound: the fixed copy
  // (equal to the migration's backfill) is the right answer, not an error.
  const notFound = s.settings.microcopy.notFound as
    NotFoundViewSettings | undefined
  if (!notFound) return NOT_FOUND_FALLBACK
  return {
    ...pageHeroView(s, notFound),
    homeLabel: textView(s, notFound.homeLabel),
  }
}

export function clientsView(s: SiteSources): ClientsProps {
  const { eyebrow, title } = s.settings["sections.clients"]
  return {
    eyebrow,
    title,
    clients: s.clients.map((c) => ({ name: c.name, logo: c.logo.url })),
  }
}

/** Icon cards; the photo variant when the section has a background. */
export function iconCardsView(
  section: WithMedia<IconCardsSectionData> & { background?: MediaView }
): IconCardsSectionProps {
  return {
    ...(section.background ? { background: section.background.url } : {}),
    eyebrow: section.eyebrow,
    title: section.title,
    description: section.description,
    cards: section.cards.map((card) => ({
      title: card.title,
      description: card.description,
      icon: card.icon.url,
    })),
  }
}

export function whyChooseUsView(s: SiteSources): IconCardsSectionProps {
  return iconCardsView(s.settings["sections.whyChooseUs"])
}

export function testimonialsView(s: SiteSources): TestimonialsProps {
  const section = s.settings["sections.testimonials"]
  return {
    eyebrow: section.eyebrow,
    title: section.title,
    verifiedLabel: section.verifiedLabel,
    prevLabel: section.prevLabel,
    nextLabel: section.nextLabel,
    items: s.testimonials.map((t) => ({
      name: t.name,
      initials: t.initials,
      quote: t.quote,
      stars: "★".repeat(t.rating),
      starsAria: interpolate(section.starsAria, { rating: t.rating }),
    })),
  }
}

/**
 * The placeholder photo every member shares until real headshots are
 * uploaded (the seeded library image, public/images/home/team-temp.png). A
 * member whose photo is this file keeps the design's crop (the baseline's
 * TEMP_PHOTO branch); any other photo fills the box.
 */
export const TEAM_PLACEHOLDER_PHOTO = "/images/home/team-temp.png"

export function teamView(s: SiteSources): TeamProps {
  const section = s.settings["sections.team"]
  return {
    background: section.background.url,
    eyebrow: section.eyebrow,
    title: section.title,
    description: section.description,
    members: s.team.map((m) => ({
      name: m.name,
      role: m.role,
      bio: m.bio,
      photo: m.photo
        ? {
            src: m.photo.url,
            placeholder: m.photo.url === TEAM_PLACEHOLDER_PHOTO,
          }
        : null,
    })),
  }
}

/** A Google Maps search for the business address (blank lines left out). */
export const mapsSearchHref = (contact: {
  addressLine1: string
  addressLine2: string
}) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [contact.addressLine1, contact.addressLine2]
      .filter((part) => part !== "")
      .join(", ")
  )}`

/** The href a contact card's action opens (none for hours / other). */
function contactCardHref(s: SiteSources, kind: ContactCardKind) {
  const contact = s.settings.contact
  switch (kind) {
    case "phone":
      return String(placeholders(s).officeHref)
    case "email":
      return `mailto:${contact.email}`
    case "address":
      return mapsSearchHref(contact)
    default:
      return null
  }
}

/** The shared Contact section; `title` overrides the section's own (the contact page). */
export function contactSectionView(
  s: SiteSources,
  title?: string
): ContactProps {
  const section = s.settings["sections.contact"]
  const { membership } = s.settings.site
  const quote = quoteCardView(s, section.quoteBox)
  return {
    eyebrow: section.eyebrow,
    title: title ?? section.title,
    description: section.description,
    labels: section.mobile ?? contactMobileDefaults,
    cards: section.infoCards.map((card) => ({
      kind: card.kind,
      title: card.title,
      icon: card.icon.url,
      lines: card.lines.map((line) => textView(s, line)),
      href: contactCardHref(s, card.kind),
    })),
    member: {
      logo: membership.logo.url,
      logoAlt: membership.logoAlt,
      title: section.memberTitle,
      subtitle: membership.name,
    },
    socials: section.socials.map((social) => ({
      label: social.label,
      icon: social.icon.url,
      href: hrefView(s, social.href),
    })),
    quote: { title: quote.title, body: quote.body, cta: quote.cta },
  }
}

export function locationMapView(s: SiteSources): LocationMapProps {
  const map = s.settings["sections.map"]
  return {
    ariaLabel: map.ariaLabel,
    tilePattern: map.tileImagePattern,
    href: hrefView(s, map.href),
    markerLabel: map.markerLabel,
    directionsLabel: (s.settings.navigation.mobile ?? navigationMobileDefaults)
      .directionsLabel,
    logo: s.settings.site.logo.url,
    pin: map.pin.url,
  }
}

/**
 * The shared "Need a Quote?" card (Settings › Microcopy) of the service and
 * article sidebars, the contact section and the services help card. A place
 * passes its overrides; each null or missing field is the shared card's.
 */
export function quoteCardView(
  s: SiteSources,
  overrides: Partial<WithMedia<QuoteCardOverrides>> = {}
): QuoteCardProps {
  const shared = s.settings.microcopy.quoteCard
  const values = placeholders(s)
  return {
    title: overrides.title ?? shared.title,
    body: overrides.body ?? shared.body,
    tel: {
      label: interpolate(overrides.phoneLabel ?? shared.phoneLabel, values),
      href: String(values.officeHref),
    },
    cta: linkView(s, overrides.cta ?? shared.cta),
  }
}

/** "View All Posts  →": the blog link of the home strip and the related articles. */
export function viewAllPostsView(s: SiteSources): Link {
  const { viewAllPosts, viewAllPostsHref } = s.settings.microcopy
  return { label: viewAllPosts, href: hrefView(s, viewAllPostsHref) }
}

// --- articles -----------------------------------------------------------

export const articlePath = (slug: string) => `/blog/${slug}`

/** Calendar date and the display form ("02 Sep 2026") in the site's time zone and language. */
export function articleDates(
  s: SiteSources,
  article: SiteArticle
): { date: string; displayDate: string } {
  if (!article.publishedAt) return { date: "", displayDate: "" }
  const zone = siteTimeZone(s.settings.site.timezone)
  return {
    date: isoDate(article.publishedAt, zone),
    displayDate: formatPostDate(
      article.publishedAt,
      zone,
      siteLocale(s.settings.site.locale)
    ),
  }
}

/** "5 min read" from the article's minutes; null without them. */
export function readTimeView(
  s: SiteSources,
  article: SiteArticle
): string | null {
  return article.readTimeMinutes === null
    ? null
    : interpolate(s.pages.blog.data.article.readTime, {
        n: article.readTimeMinutes,
      })
}

export function postCard(s: SiteSources, article: SiteArticle): PostCardData {
  return {
    slug: article.slug,
    href: articlePath(article.slug),
    title: article.content.title,
    excerpt: article.content.excerpt,
    category: article.category.name,
    ...articleDates(s, article),
    cover: article.content.cover.url,
    readTime: readTimeView(s, article),
  }
}

/** The blog's featured article: the configured slug, else the newest. */
export function featuredArticle(s: SiteSources): SiteArticle | null {
  const slug = s.pages.blog.data.featuredArticle
  return (
    (slug ? s.articles.find((a) => a.slug === slug) : undefined) ??
    s.articles[0] ??
    null
  )
}

/** Categories shown as filters and in the article sidebar. */
export const filterCategories = (s: SiteSources) =>
  s.categories.filter((c) => c.showInFilter)

/** The recent-articles card of the article sidebar. */
export function recentPosts(
  s: SiteSources,
  article: SiteArticle
): ArticleBodyProps["recent"]["posts"] {
  return s.articles
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3)
    .map((a) => ({
      slug: a.slug,
      href: articlePath(a.slug),
      title: a.content.title,
      cover: a.content.cover.url,
      ...articleDates(s, a),
    }))
}

// --- section builders ---------------------------------------------------
// One mapping per section, called by the fixed pages' views and by the page
// builder (templates/builder/views.ts), so both render the same props.

/** The home hero. The logo is the site's large logo; the badge is Settings › Site › Membership. */
export function heroView(
  s: SiteSources,
  hero: Pages["home"]["data"]["hero"]
): HeroProps {
  const { site } = s.settings
  return {
    background: hero.background.url,
    // Only when set: without a video the props are exactly what they were.
    ...(hero.backgroundVideo
      ? { backgroundVideo: hero.backgroundVideo.url }
      : {}),
    logo: { src: site.logoLarge.url, alt: site.logoAlt },
    title: hero.title,
    subtitle: hero.subtitle,
    primaryCta: linkView(s, hero.primaryCta),
    secondaryCta: linkView(s, hero.secondaryCta),
    member: {
      label: hero.memberLabel,
      logo: site.membership.logo.url,
      logoAlt: site.membership.logoAlt,
    },
  }
}

export function ourStoryView(
  s: SiteSources,
  story: Pages["about"]["data"]["story"]
): OurStoryProps {
  return {
    imageA: { src: story.imageA.url, alt: story.imageAAlt },
    imageB: { src: story.imageB.url, alt: story.imageBAlt },
    eyebrow: story.eyebrow,
    title: story.title,
    paragraphs: story.paragraphs,
    sectorsHeading: story.sectorsHeading,
    sectors: story.sectors,
    cta: linkView(s, story.cta),
  }
}

export function statsView(
  s: SiteSources,
  stats: Pages["about"]["data"]["stats"]
): StatsProps {
  return {
    stats: stats.map((stat) => ({ ...stat, label: textView(s, stat.label) })),
  }
}

/**
 * The home page's services intro (copy, photos and the short list). Each
 * item names a service by slug; one that is not published (unpublished or
 * deleted) is skipped, so the list never links to a missing page.
 */
export function servicesIntroView(
  s: SiteSources,
  services: Pages["home"]["data"]["services"]
): ServicesProps {
  return {
    imageA: { src: services.imageA.url, alt: services.imageAAlt },
    imageB: { src: services.imageB.url, alt: services.imageBAlt },
    eyebrow: services.eyebrow,
    title: services.title,
    description: services.description,
    items: services.items.flatMap((item) => {
      const service = s.services.find((x) => x.slug === item.service)
      return service
        ? [
            {
              title: service.content.title,
              description: item.description,
              href: servicePath(service.slug),
            },
          ]
        : []
    }),
    itemIcon: services.itemIcon.url,
    moreText: services.moreText,
    cta: linkView(s, services.cta),
  }
}

export const servicePath = (slug: string) => `/services/${slug}`

/** The /services card grid; the cards come from the services collection. */
export function servicesGridView(
  s: SiteSources,
  grid: Pages["services"]["data"]["grid"]
): ServicesGridProps {
  const help = quoteCardView(s, grid.helpCard)
  return {
    eyebrow: grid.eyebrow,
    title: grid.title,
    intro: grid.intro,
    priceBadge: grid.priceBadge,
    services: s.services.map((service) => ({
      slug: service.slug,
      title: service.content.title,
      icon: service.content.icon.url,
      summary: service.content.summary,
      tags: service.content.tags,
      href: servicePath(service.slug),
      learnMoreAria: interpolate(grid.learnMoreAria, {
        title: service.content.title,
      }),
    })),
    learnMore: grid.learnMore,
    quoteCta: linkView(s, grid.quoteCta),
    helpCard: {
      icon: grid.helpCard.icon.url,
      title: help.title,
      body: help.body,
      cta: help.cta,
      call: help.tel,
    },
  }
}

/** The home blog strip: the newest articles after the featured one. */
export function homeBlogView(
  s: SiteSources,
  blog: Pages["home"]["data"]["blog"]
): BlogProps {
  const featured = featuredArticle(s)
  return {
    eyebrow: blog.eyebrow,
    title: blog.title,
    description: blog.description,
    viewAll: viewAllPostsView(s),
    readArticle: s.settings.microcopy.readArticle,
    // The newest articles after the featured one (the blog page shows that one large).
    posts: s.articles
      .filter((a) => a.slug !== featured?.slug)
      .slice(0, blog.count)
      .map((a) => postCard(s, a)),
  }
}

/** A steps section's props (no `intro` key when the intro is unset). */
export function stepsSectionView(
  section: StepsSectionData,
  variant: StepsSectionProps["variant"]
): StepsSectionProps {
  return {
    eyebrow: section.eyebrow,
    title: section.title,
    ...(section.intro === null ? {} : { intro: section.intro }),
    steps: section.steps.map((step) => ({
      title: step.title,
      description: step.description,
    })),
    variant,
  }
}

export function howItWorksView(s: SiteSources): StepsSectionProps {
  return stepsSectionView(s.settings["sections.howItWorks"], "compact")
}

/** The quote form with the contact page's published copy. */
export function quoteFormView(
  s: SiteSources,
  form: Pages["contact"]["data"]["quoteForm"]
): QuoteFormProps {
  const { contact } = s.settings
  const values = placeholders(s)
  return {
    eyebrow: form.eyebrow,
    title: form.title,
    intro: form.intro,
    stepsHeading: form.stepsHeading,
    steps: form.steps,
    urgent: {
      title: form.urgentTitle,
      phone: interpolate(contact.phone24Label, values),
      phoneHref: String(values.phone24hHref),
    },
    formTitle: form.formTitle,
    fields: {
      name: form.fields.name,
      phone: form.fields.phone,
      email: form.fields.email,
      service: {
        label: form.fields.service.label,
        placeholder: form.fields.service.placeholder,
        error: form.fields.service.error,
        options: [
          ...s.services.map((service) => service.content.title),
          ...form.fields.service.extraOptions,
        ],
      },
      address: form.fields.address,
      message: form.fields.message,
      consent: form.fields.consent,
    },
    chevron: form.chevron.url,
    submitLabel: form.submitLabel,
    email: contact.email,
    sentMessage: form.sentMessage,
    sendingLabel: form.sendingLabel,
    errorMessage: form.errorMessage,
    rateLimitedMessage: form.rateLimitedMessage,
  }
}
