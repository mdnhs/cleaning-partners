import type { ClientsProps } from "@/components/home/clients"
import type { ContactProps } from "@/components/home/contact"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { TestimonialsProps } from "@/components/home/testimonials"
import type { WhyChooseUsProps } from "@/components/home/why-choose-us"
import type { HowItWorksProps } from "@/components/services/how-it-works"
import type { ServiceOverviewProps } from "@/components/services/service-overview"
import type { ServicesGridProps } from "@/components/services/services-grid"
import { interpolate } from "@/lib/interpolate"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  clientsView,
  contactSectionView,
  hrefView,
  howItWorksView,
  pageHeroView,
  placeholders,
  quoteCardView,
  servicePath,
  servicesGridView,
  testimonialsView,
  whyChooseUsView,
} from "@/templates/shared/views"

export { servicePath }

export type ServicesView = {
  chrome: ChromeView
  hero: PageHeroProps
  grid: ServicesGridProps
  whyChooseUs: WhyChooseUsProps
  clients: ClientsProps
  testimonials: TestimonialsProps
  contact: ContactProps
}

export function servicesView(s: SiteSources): ServicesView {
  const page = s.pages.services.data
  const { grid } = page
  return {
    chrome: chromeView(s),
    hero: pageHeroView(s, page.hero),
    grid: servicesGridView(s, grid),
    whyChooseUs: whyChooseUsView(s),
    clients: clientsView(s),
    testimonials: testimonialsView(s),
    contact: contactSectionView(s),
  }
}

export type ServiceDetailView = {
  chrome: ChromeView
  hero: PageHeroProps
  overview: ServiceOverviewProps
  howItWorks: HowItWorksProps
  whyChooseUs: WhyChooseUsProps
  testimonials: TestimonialsProps
  contact: ContactProps
}

/** /services/[slug]; null for an unknown or unpublished slug (the page then calls notFound()). */
export function serviceDetailView(
  s: SiteSources,
  slug: string
): ServiceDetailView | null {
  const service = s.services.find((x) => x.slug === slug)
  if (!service) return null
  const { content } = service
  const { detail } = s.pages.services.data
  const { contact, microcopy } = s.settings
  const values = placeholders(s)
  return {
    chrome: chromeView(s),
    hero: pageHeroView(
      s,
      {
        image: content.cover,
        crumb: content.title,
        title: content.title,
        description: content.heroDescription,
      },
      [
        {
          label: detail.breadcrumbLabel,
          href: hrefView(s, detail.breadcrumbHref),
        },
      ]
    ),
    overview: {
      service: {
        cover: content.cover.url,
        overviewTitle: content.overviewTitle,
        overview: content.overview,
        included: content.included,
        places: content.places,
      },
      overviewEyebrow: detail.overviewEyebrow,
      includedHeading: detail.includedHeading,
      placesHeading: detail.placesHeading,
      checkIcon: microcopy.checkIcon.url,
      nav: {
        ariaLabel: detail.sidebarAria,
        heading: detail.sidebarHeading,
        items: s.services.map((item) => ({
          slug: item.slug,
          title: item.content.title,
          href: servicePath(item.slug),
        })),
        activeSlug: service.slug,
      },
      quoteCard: quoteCardView(s),
      officeHours: {
        title: detail.officeHours.title,
        hours: detail.officeHours.hours,
        phone: interpolate(contact.phone24Label, values),
        phoneHref: String(values.phone24hHref),
      },
    },
    howItWorks: howItWorksView(s),
    whyChooseUs: whyChooseUsView(s),
    testimonials: testimonialsView(s),
    contact: contactSectionView(s),
  }
}
