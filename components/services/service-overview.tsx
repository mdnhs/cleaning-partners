import Image from "next/image"
import Link from "next/link"
import { ClockIcon, PhoneIcon } from "lucide-react"

import { QuoteCard, type QuoteCardProps } from "@/components/home/quote-card"
import { Container } from "@/components/home/section-heading"
import { renderInline } from "@/lib/rich-text/render"
import type { ParagraphsDoc } from "@/lib/schemas/common"
import { cn } from "@/lib/utils"

export type ServiceOverviewProps = {
  service: {
    cover: string
    overviewTitle: string
    overview: ParagraphsDoc
    included: string[]
    places: string[]
  }
  overviewEyebrow: string
  includedHeading: string
  placesHeading: string
  checkIcon: string
  nav: {
    ariaLabel: string
    heading: string
    items: { slug: string; title: string; href: string }[]
    activeSlug: string
  }
  quoteCard: QuoteCardProps
  officeHours: {
    title: string
    hours: string
    phone: string
    phoneHref: string
  }
}

export function ServiceOverview({
  service,
  overviewEyebrow,
  includedHeading,
  placesHeading,
  checkIcon,
  nav,
  quoteCard,
  officeHours,
}: ServiceOverviewProps) {
  const half = Math.ceil(service.included.length / 2)
  const columns = [
    service.included.slice(0, half),
    service.included.slice(half),
  ]

  return (
    <>
      <nav
        aria-label={nav.ariaLabel}
        className="border-b border-line bg-white py-3.5 md:hidden"
      >
        <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-5">
          {nav.items.map((item) => {
            const active = item.slug === nav.activeSlug
            return (
              <li key={item.slug} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-full border px-3.5 py-[9px] font-heading text-sm/[1.3] font-semibold whitespace-nowrap",
                    active
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-white text-ink"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <section className="bg-white pt-7 pb-12 md:py-28">
        <Container className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_376px] lg:gap-12">
          <div className="flex flex-col gap-5 md:gap-6">
            <div
              data-reveal
              className="relative h-[200px] overflow-hidden rounded-[20px] sm:h-[420px] sm:rounded-[28px]"
            >
              <Image
                src={service.cover}
                alt=""
                fill
                sizes="(min-width: 1024px) 776px, 100vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-2 md:gap-3">
              <p
                data-reveal
                className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[1.5px]"
              >
                {overviewEyebrow}
              </p>
              <h2
                data-split
                className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-[40px] md:tracking-normal"
              >
                {service.overviewTitle}
              </h2>
            </div>

            {service.overview.content.map((paragraph, i) => (
              <p
                key={i}
                data-reveal
                className="text-[15px] leading-[1.6] text-body md:text-[17px] md:leading-[1.7]"
              >
                {renderInline(paragraph.content)}
              </p>
            ))}

            <div className="flex flex-col gap-3.5 md:contents">
              <h3 className="font-heading text-xl/[1.25] font-bold text-ink md:text-[28px]/[normal]">
                {includedHeading}
              </h3>
              <div
                data-stagger
                className="grid gap-3.5 sm:grid-cols-2 md:gap-x-4 md:gap-y-3"
              >
                {columns.map((items, i) => (
                  <ul key={i} className="flex flex-col gap-3.5 md:gap-3">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 md:items-center md:gap-3 md:rounded-[14px] md:bg-surface md:px-[18px] md:py-4"
                      >
                        <Image
                          src={checkIcon}
                          alt=""
                          width={24}
                          height={24}
                          className="size-[22px] shrink-0 md:size-6"
                        />
                        <span className="flex-1 text-[15px] leading-[1.6] text-[#3d4650] md:text-base md:leading-[1.4] md:font-medium md:text-ink">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:contents">
              <h3 className="font-heading text-xl/[1.25] font-bold text-ink md:text-[28px]/[normal]">
                {placesHeading}
              </h3>
              <ul className="flex flex-wrap gap-2 md:gap-2.5">
                {service.places.map((place) => (
                  <li
                    key={place}
                    className="rounded-full border border-line bg-white px-3.5 py-[9px] font-heading text-sm/[1.3] font-semibold text-ink md:px-[18px] md:py-2.5 md:text-[15px]/[normal] md:text-navy"
                  >
                    {place}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="flex flex-col gap-5 md:gap-6 lg:sticky lg:top-8">
            <nav
              aria-label={nav.ariaLabel}
              className="hidden flex-col gap-2 rounded-3xl border border-line bg-white p-7 md:flex"
            >
              <h2 className="mb-3.5 font-heading text-[22px]/[normal] font-bold text-ink">
                {nav.heading}
              </h2>
              {nav.items.map((item) => {
                const active = item.slug === nav.activeSlug
                return (
                  <Link
                    key={item.slug}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between rounded-xl px-[18px] py-3.5 font-heading text-[17px]/[normal] font-semibold transition-colors",
                      active
                        ? "bg-brand text-white"
                        : "bg-surface text-ink hover:bg-brand-soft"
                    )}
                  >
                    {item.title}
                    <span
                      aria-hidden
                      className={cn(
                        "font-bold transition-transform group-hover:translate-x-1",
                        !active && "text-navy"
                      )}
                    >
                      →
                    </span>
                  </Link>
                )
              })}
            </nav>

            <QuoteCard {...quoteCard} />

            <div className="flex flex-col gap-3.5 rounded-[20px] bg-surface p-4 leading-[normal] md:gap-2.5 md:rounded-3xl md:p-7">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7fb] text-brand md:hidden"
                >
                  <ClockIcon className="size-[18px]" />
                </span>
                <div className="flex flex-col gap-px md:gap-2.5">
                  <h2 className="text-[13px]/[1.5] text-[#7a8590] md:font-heading md:text-xl/[normal] md:font-bold md:text-ink">
                    {officeHours.title}
                  </h2>
                  <p className="text-[15px]/[1.45] font-medium text-ink md:text-base/[normal] md:font-normal md:text-body">
                    {officeHours.hours}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7fb] text-brand md:hidden"
                >
                  <PhoneIcon className="size-[18px]" />
                </span>
                <a
                  href={officeHours.phoneHref}
                  className="text-[15px]/[1.45] font-medium text-ink hover:text-brand md:text-base/[normal] md:text-navy"
                >
                  {officeHours.phone}
                </a>
              </div>
            </div>
          </aside>
        </Container>
      </section>
    </>
  )
}
