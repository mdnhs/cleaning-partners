import { Clients } from "@/components/home/clients"
import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"
import { HowItWorks } from "@/components/services/how-it-works"
import { ServiceOverview } from "@/components/services/service-overview"
import { ServicesGrid } from "@/components/services/services-grid"
import { SiteLocale } from "@/components/site-locale"

import type { ServiceDetailView, ServicesView } from "./view"

/** "/services" */
export function ServicesTemplate({ view }: { view: ServicesView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            <ServicesGrid {...view.grid} />
            <WhyChooseUs {...view.whyChooseUs} />
            <Clients {...view.clients} />
            <Testimonials {...view.testimonials} />
            <Contact {...view.contact} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}

/** "/services/[slug]" */
export function ServiceDetailTemplate({ view }: { view: ServiceDetailView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            <ServiceOverview {...view.overview} />
            <HowItWorks {...view.howItWorks} />
            <WhyChooseUs {...view.whyChooseUs} />
            <Testimonials {...view.testimonials} />
            <Contact {...view.contact} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
