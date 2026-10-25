import { QuoteForm } from "@/components/contact/quote-form"
import { Contact } from "@/components/home/contact"
import { LocationMap } from "@/components/home/location-map"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"
import { SiteLocale } from "@/components/site-locale"

import type { ContactView } from "./view"

/** "/contact" */
export function ContactTemplate({ view }: { view: ContactView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            <Contact {...view.contact} />
            <QuoteForm {...view.form} />
            <LocationMap {...view.map} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
