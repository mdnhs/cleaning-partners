import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { services } from "@/lib/services"

export function ServicesGrid() {
  return (
    <section id="services" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <div className="flex max-w-[760px] flex-col gap-3 text-center">
          <p
            data-reveal
            className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
          >
            CHECK OUT
          </p>
          <h2
            data-split
            className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
          >
            Clean as a Button!
          </h2>
          <p data-reveal className="text-lg leading-[1.6] text-body">
            Professional cleaning tailored to your space, delivered by trained
            and trusted teams. Prices vary, so every quote is tailored to you.
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
                  Prices Vary
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
                  href={`/services/${service.slug}`}
                  aria-label={`Learn more about ${service.title}`}
                  className="font-heading text-base/[normal] font-bold text-navy hover:text-brand"
                >
                  Learn More&nbsp;&nbsp;→
                </Link>
                <a
                  href="#contact"
                  className={buttonVariants({
                    variant: "brand",
                    size: "pill-sm",
                    className: "px-[22px] py-[11px] text-[15px]/[normal]",
                  })}
                >
                  Get A Quote
                </a>
              </div>
            </li>
          ))}

          <li className="flex flex-col items-start gap-4 rounded-3xl bg-navy px-8 py-9">
            <div className="flex size-16 items-center justify-center rounded-[18px] bg-white/14">
              <Image
                src="/images/services/icon-help.svg"
                alt=""
                width={32}
                height={32}
              />
            </div>
            <h3 className="font-heading text-[28px]/[normal] font-bold text-white">
              Not sure what you need?
            </h3>
            <p className="text-base leading-[1.6] text-white/85">
              Tell us about your space and we&apos;ll put together a cleaning
              plan and price that suits you.
            </p>
            <div aria-hidden className="flex-1" />
            <a
              href="#contact"
              className={buttonVariants({
                variant: "light",
                size: "pill",
                className: "text-navy",
              })}
            >
              Contact Us
            </a>
            <a
              href="tel:+353578697670"
              className="text-[15px]/[normal] font-medium text-white/85 hover:text-white"
            >
              Or call 057 8697670 Ext 4
            </a>
          </li>
        </ul>
      </Container>
    </section>
  )
}
