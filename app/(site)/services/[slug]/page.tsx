import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { Testimonials } from "@/components/home/testimonials"
import { WhyChooseUs } from "@/components/home/why-choose-us"
import { HomeMotion } from "@/components/motion/home-motion"
import { HowItWorks } from "@/components/services/how-it-works"
import { ServiceOverview } from "@/components/services/service-overview"
import { getService, services } from "@/lib/services"

export const dynamicParams = false

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/services/[slug]">): Promise<Metadata> {
  const service = getService((await params).slug)
  if (!service) return {}
  return {
    title: `${service.title} | Cleaning Partners Ltd.`,
    description: service.heroDescription,
  }
}

export default async function ServicePage({
  params,
}: PageProps<"/services/[slug]">) {
  const service = getService((await params).slug)
  if (!service) notFound()

  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="Services" />
        <main>
          <PageHero
            parents={[{ label: "Services", href: "/services" }]}
            crumb={service.title}
            title={service.title}
            description={service.heroDescription}
            image={service.cover}
          />
          <ServiceOverview service={service} />
          <HowItWorks />
          <WhyChooseUs />
          <Testimonials />
          <Contact />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
