import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"

export type ServicesGridProps = {
  eyebrow: string
  title: string
  intro: string
  priceBadge: string
  services: {
    slug: string
    title: string
    icon: string
    summary: string
    tags: string[]
    href: string
    learnMoreAria: string
  }[]
  learnMore: string
  quoteCta: { label: string; href: string }
  helpCard: {
    icon: string
    title: string
    body: string
    cta: { label: string; href: string }
    call: { label: string; href: string }
  }
}

export function ServicesGrid({
  eyebrow,
  title,
  intro,
  priceBadge,
  services,
  learnMore,
  quoteCta,
  helpCard,
}: ServicesGridProps) {
  return (
    <section id="services" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <div className="flex max-w-[760px] flex-col gap-3 text-center">
          <p
            data-reveal
            className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
          >
            {eyebrow}
          </p>
          <h2
            data-split
            className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
          >
            {title}
          </h2>
          <p data-reveal className="text-lg leading-[1.6] text-body">
            {intro}
          </p>
        </div>

        <ul
          data-stagger
          className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service) => (
            <li
              key={service.title}
              className="flex flex-col gap-[18px] rounded-3xl border border-line bg-white px-8 py-9 transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-16 items-center justify-center rounded-[18px] bg-brand">
                  <Image src={service.icon} alt="" width={32} height={32} />
                </div>
                <span className="rounded-full bg-surface px-3.5 py-1.5 font-heading text-sm/[normal] font-semibold text-navy">
                  {priceBadge}
                </span>
              </div>
              <h3 className="font-heading text-[26px]/[normal] font-bold text-ink">
                {service.title}
              </h3>
              <p className="text-base leading-[1.6] text-body">
                {service.summary}
              </p>
              <ul className="flex flex-wrap gap-2">
                {service.tags.map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-surface px-3 py-1.5 text-[13px]/[normal] font-medium text-navy"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <div aria-hidden className="flex-1" />
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={service.href}
                  aria-label={service.learnMoreAria}
                  className="font-heading text-base/[normal] font-bold text-navy hover:text-brand"
                >
                  {learnMore}
                </Link>
                <a
                  href={quoteCta.href}
                  className={buttonVariants({
                    variant: "brand",
                    size: "pill-sm",
                    className: "px-[22px] py-[11px] text-[15px]/[normal]",
                  })}
                >
                  {quoteCta.label}
                </a>
              </div>
            </li>
          ))}

          <li className="flex flex-col items-start gap-4 rounded-3xl bg-navy px-8 py-9">
            <div className="flex size-16 items-center justify-center rounded-[18px] bg-white/14">
              <Image src={helpCard.icon} alt="" width={32} height={32} />
            </div>
            <h3 className="font-heading text-[28px]/[normal] font-bold text-white">
              {helpCard.title}
            </h3>
            <p className="text-base leading-[1.6] text-white/85">
              {helpCard.body}
            </p>
            <div aria-hidden className="flex-1" />
            <a
              href={helpCard.cta.href}
              className={buttonVariants({
                variant: "light",
                size: "pill",
                className: "text-navy",
              })}
            >
              {helpCard.cta.label}
            </a>
            <a
              href={helpCard.call.href}
              className="text-[15px]/[normal] font-medium text-white/85 hover:text-white"
            >
              {helpCard.call.label}
            </a>
          </li>
        </ul>
      </Container>
    </section>
  )
}
