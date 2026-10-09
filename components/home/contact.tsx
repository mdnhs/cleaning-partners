import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

const infoCards = [
  {
    title: "Phone",
    icon: "/images/home/phone.svg",
    lines: [
      "Tel: 057 8697670 Ext 4",
      "Mobile: 085 806 2369",
      "24hr contact: (085) 8062369",
    ],
  },
  {
    title: "Email",
    icon: "/images/home/mail.svg",
    lines: ["info@cleaningpartners.ie"],
  },
  {
    title: "Location",
    icon: "/images/home/pin.svg",
    lines: ["Derryguile, Mountmellick,", "Co. Laois, Ireland. R32 YX49"],
  },
  {
    title: "Office Hours",
    icon: "/images/home/clock.svg",
    lines: ["Mon–Fri: 9am – 6pm"],
  },
]

const socials = [
  { label: "Facebook", icon: "/images/home/facebook.png", href: "#" },
  { label: "Instagram", icon: "/images/home/instagram.png", href: "#" },
]

export function Contact() {
  return (
    <section id="contact" className="bg-white py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          align="left"
          eyebrow="GET IN TOUCH"
          title="Contact Us"
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ul data-stagger className="grid gap-6 sm:grid-cols-2">
              {infoCards.map((card) => (
                <li
                  key={card.title}
                  className="flex items-start gap-[18px] rounded-3xl bg-surface p-7"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-brand">
                    <Image src={card.icon} alt="" width={22} height={22} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="font-heading text-xl font-bold text-ink">
                      {card.title}
                    </h3>
                    {card.lines.map((line) => (
                      <p
                        key={line}
                        className="text-[15px] leading-[1.5] text-body"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div
              data-reveal
              className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-white px-5 py-4"
            >
              <div className="relative h-[58px] w-[110px] shrink-0">
                <Image
                  src="/images/home/icca-member.png"
                  alt="ICCA"
                  fill
                  sizes="110px"
                  className="object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-heading text-lg font-bold text-ink">
                  Member of the ICCA
                </p>
                <p className="text-sm text-body">
                  Irish Contract Cleaning Association
                </p>
              </div>
              <div className="flex gap-2.5">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="relative size-10 transition-opacity hover:opacity-80"
                  >
                    <Image
                      src={social.icon}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div
            data-reveal
            className="flex flex-col justify-center gap-5 rounded-[28px] bg-brand px-10 py-12 lg:w-[380px] lg:shrink-0"
          >
            <h3 className="font-heading text-[44px] leading-[1.05] font-bold text-white">
              Need a Quote?
            </h3>
            <p className="text-[17px] leading-[1.6] text-white/92">
              Tell us about your space and we&apos;ll put together a cleaning
              plan and price that suits you.
            </p>
            <a
              href="mailto:info@cleaningpartners.ie?subject=Quote%20request"
              className={buttonVariants({
                variant: "light",
                size: "pill",
                className: "w-full",
              })}
            >
              Fill the Form
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
