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
    <section id="services" className="bg-surface py-12 md:py-28">
      <Container className="flex flex-col items-start gap-4 md:items-center md:gap-14">
        <div className="flex max-w-[760px] flex-col gap-2 text-left md:gap-3 md:text-center">
          <p
            data-reveal
            className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[1.5px]"
          >
            {eyebrow}
          </p>
          <h2
            data-split
            className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-5xl md:tracking-normal"
          >
            {title}
          </h2>
          <p
            data-reveal
            className="text-base leading-[1.6] text-body md:text-lg"
          >
            {intro}
          </p>
        </div>

        <ul className="grid w-full gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.title}
              data-service-card
              className="group relative isolate grid grid-cols-[48px_1fr] gap-x-3.5 gap-y-3.5 rounded-[20px] border border-line bg-white p-5 shadow-[0px_8px_12px_0px_rgba(13,38,64,0.05)] transition-[translate,box-shadow,border-color] duration-300 ease-out hover:border-brand/40 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)] has-[a:focus-visible]:border-brand/40 has-[a:focus-visible]:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)] motion-safe:hover:-translate-y-1.5! md:flex md:flex-col md:gap-[18px] md:rounded-3xl md:px-8 md:py-9 md:shadow-none"
            >
              <div
                aria-hidden
                data-service-glow
                className="pointer-events-none absolute inset-0 -z-10 rounded-[20px] bg-[radial-gradient(circle_at_100%_100%,rgba(17,177,209,0.24),rgba(40,100,143,0.08)_42%,transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:rounded-3xl"
              />
              <div className="contents md:flex md:items-center md:justify-between">
                <div
                  data-service-icon
                  className="col-start-1 row-span-2 row-start-1 flex size-12 items-center justify-center self-center rounded-[14px] bg-brand md:size-16 md:rounded-[18px]"
                >
                  <Image src={service.icon} alt="" width={32} height={32} />
                </div>
                <span className="col-start-2 row-start-2 -mt-3 text-[13px]/[1.5] font-medium text-[#0e93ad] md:mt-0 md:rounded-full md:bg-surface md:px-3.5 md:py-1.5 md:font-heading md:text-sm/[normal] md:font-semibold md:text-navy">
                  {priceBadge}
                </span>
              </div>
              <h3 className="col-start-2 row-start-1 self-end font-heading text-xl/[1.25] font-bold text-ink group-hover:bg-linear-to-r group-hover:from-brand group-hover:to-navy group-hover:bg-clip-text group-hover:text-transparent group-has-[a:focus-visible]:bg-linear-to-r group-has-[a:focus-visible]:from-brand group-has-[a:focus-visible]:to-navy group-has-[a:focus-visible]:bg-clip-text group-has-[a:focus-visible]:text-transparent md:self-auto md:text-[26px]/[normal]">
                {service.title}
              </h3>
              <p className="col-span-full text-sm leading-[1.55] text-body md:text-base md:leading-[1.6]">
                {service.summary}
              </p>
              <ul className="col-span-full flex flex-wrap gap-1.5 md:gap-2">
                {service.tags.map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-surface px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-[#3d4650] md:px-3 md:py-1.5 md:text-[13px]/[normal] md:text-navy"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <div aria-hidden className="hidden flex-1 md:block" />
              <div className="col-span-full flex items-center justify-between gap-4">
                <Link
                  href={service.href}
                  aria-label={service.learnMoreAria}
                  className="font-heading text-base/[normal] font-bold text-navy hover:text-brand"
                >
                  {`${learnMore.replace(/\s*→\s*$/, "")} `}
                  <span
                    aria-hidden
                    className="inline-block transition-transform duration-300 ease-out motion-safe:group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
                <a
                  href={quoteCta.href}
                  className={buttonVariants({
                    variant: "brand",
                    size: "pill-sm",
                    className:
                      "px-[18px] py-2.5 text-sm/[1.3] md:px-[22px] md:py-[11px] md:text-[15px]/[normal]",
                  })}
                >
                  {quoteCta.label}
                </a>
              </div>
            </li>
          ))}

          <li className="flex flex-col items-start gap-3 rounded-[20px] bg-navy p-6 md:gap-4 md:rounded-3xl md:px-8 md:py-9">
            <div className="flex size-12 items-center justify-center rounded-[14px] bg-white/14 md:size-16 md:rounded-[18px]">
              <Image src={helpCard.icon} alt="" width={32} height={32} />
            </div>
            <h3 className="font-heading text-xl/[1.25] font-bold text-white md:text-[28px]/[normal]">
              {helpCard.title}
            </h3>
            <p className="text-sm leading-[1.55] text-white/85 md:text-base md:leading-[1.6]">
              {helpCard.body}
            </p>
            <div aria-hidden className="hidden flex-1 md:block" />
            <a
              href={helpCard.cta.href}
              className={buttonVariants({
                variant: "light",
                size: "pill",
                className: "text-navy max-md:w-full",
              })}
            >
              {helpCard.cta.label}
            </a>
            <a
              href={helpCard.call.href}
              className="text-[13px]/[1.5] font-medium text-white/80 hover:text-white md:text-[15px]/[normal] md:text-white/85"
            >
              {helpCard.call.label}
            </a>
          </li>
        </ul>
      </Container>
    </section>
  )
}
