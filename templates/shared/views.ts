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
import type { WhyChooseUsProps } from "@/components/home/why-choose-us"
import type { HowItWorksProps } from "@/components/services/how-it-works"
import type { ServicesGridProps } from "@/components/services/services-grid"
import { formatPostDate, isoDate, siteTimeZone } from "@/lib/format"
import {
  contactPlaceholders,
  interpolate,
  interpolateHref,
} from "@/lib/interpolate"
import type { WithMedia } from "@/lib/media"
import type { Link, PageHero, PageHeroText } from "@/lib/schemas/common"

import type { SiteArticle, SiteSources } from "./sources"

type Pages = SiteSources["pages"]

// Builders shared by several templates: header, footer, the shared sections
// and the card shapes. Pure functions of SiteSources. They hand the
// components strings only (urls, text, hrefs), never a media row, so the
// pages render the same whatever dimensions the media rows carry.

/** Settings.contact fields + derived tel: hrefs for {placeholders}. */
export const placeholders = (s: SiteSources) =>
  contactPlaceholders(s.settings.contact)

/**
 * An admin-editable href: {placeholders} filled, then re-checked; an unsafe
 * or unresolved result renders "#".
 */
export const hrefView = (s: SiteSources, href: string) =>
  interpolateHref(href, placeholders(s))

/** A stored { label, href } link with its label and href filled in. */
export const linkView = (s: SiteSources, link: Link): Link => ({
  label: interpolate(link.label, placeholders(s)),
  href: hrefView(s, link.href),
})

/** A stored text with {placeholders} filled in. */
export const textView = (s: SiteSources, text: string) =>
  interpolate(text, placeholders(s))

export type ChromeView = {
  header: SiteHeaderProps
  footer: SiteFooterProps
  /** <html lang> (settings.site.locale), applied by SiteLocale. */
  locale: string
}

export function chromeView(s: SiteSources): ChromeView {
  const { site, contact, navigation, footer } = s.settings
  const values = placeholders(s)
  const links = navigation.links.map((l) => linkView(s, l))
  // `animation` only when set: without one the props are exactly what they
  // were before the field existed.
  const animation = site.logoAnimation
    ? { animation: site.logoAnimation.url }
    : {}
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
      links,
      cta: linkView(s, navigation.cta),
      menuAria: navigation.menuAria,
    },
    footer: {
      logo: { src: site.logo.url, alt: site.logoAlt, ...animation },
      tagline: footer.tagline,
      quickLinks: { title: footer.quickLinksTitle, links },
      contact: {
        title: footer.contactTitle,
        lines: [
          contact.addressLine1,
          footer.addressLine2,
          interpolate(footer.contactOfficeLine, values),
          contact.email,
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
        privacy: {
          label: footer.privacyLabel,
          href: hrefView(s, footer.privacyHref),
        },
        terms: {
          label: footer.termsLabel,
          href: hrefView(s, footer.termsHref),
        },
      },
    },
  }
}

/**
 * The inner-page hero. A hero without its own banner (about, contact) uses
 * the site's default hero image.
 */
export function pageHeroView(
  s: SiteSources,
  hero: WithMedia<PageHero> | WithMedia<PageHeroText>,
  parents: PageHeroProps["parents"] = []
): PageHeroProps {
  const { navigation, microcopy, site } = s.settings
  return {
    image: ("image" in hero ? hero.image : site.defaultHeroImage).url,
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

export function clientsView(s: SiteSources): ClientsProps {
  const { eyebrow, title } = s.settings["sections.clients"]
  return {
    eyebrow,
    title,
    clients: s.clients.map((c) => ({ name: c.name, logo: c.logo.url })),
  }
}

export function whyChooseUsView(s: SiteSources): WhyChooseUsProps {
  const section = s.settings["sections.whyChooseUs"]
  return {
    background: section.background.url,
    eyebrow: section.eyebrow,
    title: section.title,
    description: section.description,
    features: section.features.map((f) => ({
      title: f.title,
      description: f.description,
      icon: f.icon.url,
    })),
  }
}

export function testimonialsView(s: SiteSources): TestimonialsProps {
  const section = s.settings["sections.testimonials"]
  return {
    eyebrow: section.eyebrow,
    title: section.title,
    verifiedLabel: section.verifiedLabel,
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

/** The shared Contact section; `title` overrides the section's own (the contact page). */
export function contactSectionView(
  s: SiteSources,
  title?: string
): ContactProps {
  const section = s.settings["sections.contact"]
  return {
    eyebrow: section.eyebrow,
    title: title ?? section.title,
    cards: section.infoCards.map((card) => ({
      title: card.title,
      icon: card.icon.url,
      lines: card.lines.map((line) => textView(s, line)),
    })),
    member: {
      logo: section.memberLogo.url,
      logoAlt: section.memberLogoAlt,
      title: section.memberTitle,
      subtitle: section.memberSubtitle,
    },
    socials: section.socials.map((social) => ({
      label: social.label,
      icon: social.icon.url,
      href: hrefView(s, social.href),
    })),
    quote: {
      title: section.quoteBox.title,
      body: section.quoteBox.body,
      cta: linkView(s, section.quoteBox.cta),
    },
  }
}

export function locationMapView(s: SiteSources): LocationMapProps {
  const map = s.settings["sections.map"]
  return {
    ariaLabel: map.ariaLabel,
    tilePattern: map.tileImagePattern,
    href: hrefView(s, map.href),
    markerLabel: map.markerLabel,
    logo: s.settings.site.logo.url,
    pin: map.pin.url,
  }
}

/** The "Need a Quote?" card of the service and article sidebars. */
export function quoteCardView(s: SiteSources): QuoteCardProps {
  const card = s.settings.microcopy.quoteCard
  const values = placeholders(s)
  return {
    title: card.title,
    body: card.body,
    tel: {
      label: interpolate(card.telLabel, values),
      href: String(values.officeHref),
    },
    cta: linkView(s, card.cta),
  }
}

/** "View All Posts  →": the blog link of the home strip and the related articles. */
export function viewAllPostsView(s: SiteSources): Link {
  const { viewAllPosts, viewAllPostsHref } = s.settings.microcopy
  return { label: viewAllPosts, href: hrefView(s, viewAllPostsHref) }
}

// --- articles -----------------------------------------------------------

export const articlePath = (slug: string) => `/blog/${slug}`

/** Calendar date and the display form ("02 Sep 2026") in the site's time zone. */
export function articleDates(
  s: SiteSources,
  article: SiteArticle
): { date: string; displayDate: string } {
  if (!article.publishedAt) return { date: "", displayDate: "" }
  const zone = siteTimeZone(s.settings.site.timezone)
  return {
    date: isoDate(article.publishedAt, zone),
    displayDate: formatPostDate(article.publishedAt, zone),
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

/** The home hero. The logo is the site's large logo. */
export function heroView(
  s: SiteSources,
  hero: Pages["home"]["data"]["hero"]
): HeroProps {
  const { site } = s.settings
  return {
    background: hero.background.url,
    logo: { src: site.logoLarge.url, alt: site.logoAlt },
    title: hero.title,
    subtitle: hero.subtitle,
    primaryCta: linkView(s, hero.primaryCta),
    secondaryCta: linkView(s, hero.secondaryCta),
    member: {
      label: hero.memberLabel,
      logo: hero.memberLogo.url,
      logoAlt: hero.memberLogoAlt,
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

/** The home page's services intro (copy, photos and the short list). */
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
    items: services.items,
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
  const values = placeholders(s)
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
      title: grid.helpCard.title,
      body: grid.helpCard.body,
      cta: linkView(s, grid.helpCard.cta),
      call: {
        label: interpolate(grid.helpCard.callLabel, values),
        href: String(values.officeHref),
      },
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

export function howItWorksView(s: SiteSources): HowItWorksProps {
  const howItWorks = s.settings["sections.howItWorks"]
  return {
    eyebrow: howItWorks.eyebrow,
    title: howItWorks.title,
    steps: howItWorks.steps,
  }
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
