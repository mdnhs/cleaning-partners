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
  heroView,
  homeBlogView,
  locationMapView,
  servicesIntroView,
  teamView,
  testimonialsView,
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
  const { hero, services, blog } = page
  return {
    chrome: chromeView(s),
    hero: heroView(s, hero),
    clients: clientsView(s),
    services: servicesIntroView(s, services),
    whyChooseUs: whyChooseUsView(s),
    testimonials: testimonialsView(s),
    team: teamView(s),
    blog: homeBlogView(s, blog),
    contact: contactSectionView(s),
    map: locationMapView(s),
  }
}
