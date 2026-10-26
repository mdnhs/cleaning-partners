import type { QuoteFormProps } from "@/components/contact/quote-form"
import type { ContactProps } from "@/components/home/contact"
import type { LocationMapProps } from "@/components/home/location-map"
import type { PageHeroProps } from "@/components/home/page-hero"
import { interpolate } from "@/lib/interpolate"
import type { SiteSources } from "@/templates/shared/sources"
import {
  type ChromeView,
  chromeView,
  contactSectionView,
  locationMapView,
  pageHeroView,
  placeholders,
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
  const { contact } = s.settings
  const values = placeholders(s)
  return {
    chrome: chromeView(s),
    hero: pageHeroView(s, page.hero),
    contact: contactSectionView(s, page.contactTitle),
    form: {
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
    },
    map: locationMapView(s),
  }
}
