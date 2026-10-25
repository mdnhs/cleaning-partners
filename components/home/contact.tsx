import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

export type ContactProps = {
  eyebrow: string
  title: string
  cards: { title: string; icon: string; lines: string[] }[]
  member: { logo: string; logoAlt: string; title: string; subtitle: string }
  socials: { label: string; icon: string; href: string }[]
  quote: { title: string; body: string; cta: { label: string; href: string } }
}

export function Contact({
  eyebrow,
  title,
  cards,
  member,
  socials,
  quote,
}: ContactProps) {
  return (
    <section id="contact" className="bg-white py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          align="left"
          eyebrow={eyebrow}
          title={title}
          titleClassName="leading-[normal]"
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ul data-stagger className="grid gap-6 sm:grid-cols-2">
              {cards.map((card) => (
                <li
                  key={card.title}
                  className="flex items-start gap-[18px] rounded-3xl bg-surface p-7"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-brand">
                    <Image src={card.icon} alt="" width={22} height={22} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="font-heading text-xl/[normal] font-bold text-ink">
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
                  src={member.logo}
                  alt={member.logoAlt}
                  fill
                  sizes="110px"
                  className="object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-heading text-lg/[normal] font-bold text-ink">
                  {member.title}
                </p>
                <p className="text-sm/[normal] text-body">{member.subtitle}</p>
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
              {quote.title}
            </h3>
            <p className="text-[17px] leading-[1.6] text-white/92">
              {quote.body}
            </p>
            <Link
              href={quote.cta.href}
              className={buttonVariants({
                variant: "light",
                size: "pill",
                className: "w-full",
              })}
            >
              {quote.cta.label}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
