import Image from "next/image"
import Link from "next/link"

import { QuoteCard } from "@/components/home/quote-card"
import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"
import { services, type Service } from "@/lib/services"

export function ServiceOverview({ service }: { service: Service }) {
  const half = Math.ceil(service.included.length / 2)
  const columns = [
    service.included.slice(0, half),
    service.included.slice(half),
  ]

  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_376px]">
        <div className="flex flex-col gap-6">
          <div
            data-reveal
            className="relative h-[260px] overflow-hidden rounded-[28px] sm:h-[420px]"
          >
            <Image
              src={service.cover}
              alt=""
              fill
              sizes="(min-width: 1024px) 776px, 100vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col gap-3">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
            >
              SERVICE OVERVIEW
            </p>
            <h2
              data-split
              className="font-heading text-[32px] leading-[1.15] font-bold text-ink md:text-[40px]"
            >
              {service.overviewTitle}
            </h2>
          </div>

          {service.overview.map((text) => (
            <p
              key={text.slice(0, 24)}
              data-reveal
              className="text-[17px] leading-[1.7] text-body"
            >
              {text}
            </p>
          ))}

          <h3 className="font-heading text-[28px]/[normal] font-bold text-ink">
            What&apos;s Included
          </h3>
          <div data-stagger className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {columns.map((items, i) => (
              <ul key={i} className="flex flex-col gap-3">
                {items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-[14px] bg-surface px-[18px] py-4"
                  >
                    <Image
                      src="/images/services/check.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="shrink-0"
                    />
                    <span className="flex-1 text-base leading-[1.4] font-medium text-ink">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>

          <h3 className="font-heading text-[28px]/[normal] font-bold text-ink">
            Where We Clean
          </h3>
          <ul className="flex flex-wrap gap-2.5">
            {service.places.map((place) => (
              <li
                key={place}
                className="rounded-full border border-line bg-white px-[18px] py-2.5 font-heading text-[15px]/[normal] font-semibold text-navy"
              >
                {place}
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
          <nav
            aria-label="Our services"
            className="flex flex-col gap-2 rounded-3xl border border-line bg-white p-7"
          >
            <h2 className="mb-3.5 font-heading text-[22px]/[normal] font-bold text-ink">
              Our Services
            </h2>
            {services.map((item) => {
              const active = item.slug === service.slug
              return (
                <Link
                  key={item.slug}
                  href={`/services/${item.slug}`}
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

          <QuoteCard />

          <div className="flex flex-col gap-2.5 rounded-3xl bg-surface p-7 leading-[normal]">
            <h2 className="font-heading text-xl/[normal] font-bold text-ink">
              Office Hours
            </h2>
            <p className="text-base/[normal] text-body">Mon – Fri: 9am – 6pm</p>
            <a
              href="tel:+353858062369"
              className="text-base/[normal] font-medium text-navy hover:text-brand"
            >
              24hr contact: (085) 8062369
            </a>
          </div>
        </aside>
      </Container>
    </section>
  )
}
