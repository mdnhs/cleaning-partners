import type { QuoteFormProps } from "@/components/contact/quote-form"
import type { ContactProps } from "@/components/home/contact"
import type { LocationMapProps } from "@/components/home/location-map"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  contactSectionView,
  locationMapView,
  pageHeroView,
  quoteFormView,
} from "@/templates/shared/views"

export type ContactView = {
  chrome: ChromeView
  hero: PageHeroProps
  contact: ContactProps
  form: QuoteFormProps
  map: LocationMapProps
}

export function contactView(s: SiteSources): ContactView {
  const page = s.pages.contact.data
  const { quoteForm: form } = page
  return {
    chrome: chromeView(s),
    hero: pageHeroView(s, page.hero),
    contact: contactSectionView(s, page.contactTitle),
    form: quoteFormView(s, form),
    map: locationMapView(s),
  }
}
