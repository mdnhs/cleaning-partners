import type { BlogProps } from "@/components/home/blog"
import type { ClientsProps } from "@/components/home/clients"
import type { ContactProps } from "@/components/home/contact"
import type { HeroProps } from "@/components/home/hero"
import type { LocationMapProps } from "@/components/home/location-map"
import type { ServicesProps } from "@/components/home/services"
import type { TeamProps } from "@/components/home/team"
import type { TestimonialsProps } from "@/components/home/testimonials"
import type { WhyChooseUsProps } from "@/components/home/why-choose-us"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  clientsView,
  contactSectionView,
  featuredArticle,
  linkView,
  locationMapView,
  postCard,
  teamView,
  testimonialsView,
  viewAllPostsView,
  whyChooseUsView,
} from "@/templates/shared/views"

export type HomeView = {
  chrome: ChromeView
  hero: HeroProps
  clients: ClientsProps
  services: ServicesProps
  whyChooseUs: WhyChooseUsProps
  testimonials: TestimonialsProps
  team: TeamProps
  blog: BlogProps
  contact: ContactProps
  map: LocationMapProps
}

export function homeView(s: SiteSources): HomeView {
  const page = s.pages.home.data
  const { site, microcopy } = s.settings
  const { hero, services, blog } = page
  const featured = featuredArticle(s)
  return {
    chrome: chromeView(s),
    hero: {
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
    },
    clients: clientsView(s),
    services: {
      imageA: { src: services.imageA.url, alt: services.imageAAlt },
      imageB: { src: services.imageB.url, alt: services.imageBAlt },
      eyebrow: services.eyebrow,
      title: services.title,
      description: services.description,
      items: services.items,
      itemIcon: services.itemIcon.url,
      moreText: services.moreText,
      cta: linkView(s, services.cta),
    },
    whyChooseUs: whyChooseUsView(s),
    testimonials: testimonialsView(s),
    team: teamView(s),
    blog: {
      eyebrow: blog.eyebrow,
      title: blog.title,
      description: blog.description,
      viewAll: viewAllPostsView(s),
      readArticle: microcopy.readArticle,
      // The newest articles after the featured one (the blog page shows that one large).
      posts: s.articles
        .filter((a) => a.slug !== featured?.slug)
        .slice(0, blog.count)
        .map((a) => postCard(s, a)),
    },
    contact: contactSectionView(s),
    map: locationMapView(s),
  }
}
