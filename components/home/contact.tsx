import Image from "next/image"
import Link from "next/link"
import { NavigationIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

export type ContactProps = {
  eyebrow: string
  title: string
  description?: string
  labels: {
    callLabel: string
    emailLabel: string
    directionsLabel: string
    mapLabel: string
    followLabel: string
  }
  cards: { title: string; icon: string; lines: string[] }[]
  member: { logo: string; logoAlt: string; title: string; subtitle: string }
  socials: { label: string; icon: string; href: string }[]
  quote: { title: string; body: string; cta: { label: string; href: string } }
}

type InfoCard = ContactProps["cards"][number]

/** The first line of a card as a tel: link (digits and a leading +). */
function telHref(card?: InfoCard) {
  const line = card?.lines[0] ?? ""
  const number = line.replace(/^[^\d+]*/, "").replace(/[^\d+]/g, "")
  return number ? `tel:${number}` : "#"
}

function mailHref(card?: InfoCard) {
  const email = card?.lines.join(" ").match(/[^\s@]+@[^\s@]+/)?.[0]
  return email ? `mailto:${email}` : "#"
}

function mapHref(card?: InfoCard) {
  const address = card?.lines.join(" ")
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "#"
}

export function Contact({
  eyebrow,
  title,
  description,
  labels,
  cards,
  member,
  socials,
  quote,
}: ContactProps) {
  const [phone, email, location] = cards
  const quickActions = [
    { label: labels.callLabel, href: telHref(phone), icon: phone?.icon },
    { label: labels.emailLabel, href: mailHref(email), icon: email?.icon },
    { label: labels.directionsLabel, href: mapHref(location), icon: null },
  ]
  // Rows on a phone: the first three cards get a small action pill.
  const rowActions = [
    { label: labels.callLabel, href: telHref(phone) },
    { label: labels.emailLabel, href: mailHref(email) },
    { label: labels.mapLabel, href: mapHref(location) },
  ]

  return (
    <section id="contact" className="bg-white py-12 sm:py-16 md:py-28">
      <Container className="flex flex-col gap-5 sm:gap-14">
        <SectionHeading
          align="left"
          eyebrow={eyebrow}
          title={title}
          titleClassName="sm:leading-[normal]"
          className="max-sm:gap-2"
        />
        {description ? (
          <p className="-mt-3 text-base leading-[1.6] text-body sm:hidden">
            {description}
          </p>
        ) : null}

        {/* Phones: quick actions, one list of contact rows, the quote box
            and the membership card (the design's own layout). */}
        <div className="flex flex-col gap-5 md:hidden">
          <ul className="flex gap-2.5">
            {quickActions.map((action) => (
              <li key={action.label} className="min-w-0 flex-1">
                <a
                  href={action.href}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-2 py-3.5 font-heading text-sm/[1.3] font-semibold text-ink"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand">
                    {action.icon ? (
                      <Image src={action.icon} alt="" width={20} height={20} />
                    ) : (
                      <NavigationIcon
                        aria-hidden
                        className="size-5 text-white"
                      />
                    )}
                  </span>
                  {action.label}
                </a>
              </li>
            ))}
          </ul>

          <ul className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-white">
            {cards.map((card, index) => {
              const action = rowActions[index]
              return (
                <li
                  key={card.title}
                  className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand">
                    <Image src={card.icon} alt="" width={20} height={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink">
                      {card.title}
                    </h3>
                    <div className="text-sm leading-[1.55] text-body">
                      {card.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                  {action ? (
                    <a
                      href={action.href}
                      className="shrink-0 rounded-full bg-brand-soft px-3 py-[7px] text-[13px]/[1.5] font-medium text-brand-deep"
                    >
                      {action.label}
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col gap-3 rounded-[20px] bg-navy p-6">
            <h3 className="font-heading text-xl/[1.25] font-bold text-white">
              {quote.title}
            </h3>
            <p className="text-sm leading-[1.55] text-white/85">{quote.body}</p>
            {phone ? (
              <a
                href={telHref(phone)}
                className="flex items-center gap-2 text-[15px]/[1.45] font-medium text-white"
              >
                <Image src={phone.icon} alt="" width={16} height={16} />
                {phone.lines[0]}
              </a>
            ) : null}
            <Link
              href={quote.cta.href}
              className={buttonVariants({
                variant: "brand",
                size: "pill",
                className: "w-full",
              })}
            >
              {quote.cta.label}
            </Link>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-white p-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-11 w-[84px] shrink-0">
                <Image
                  src={member.logo}
                  alt={member.logoAlt}
                  fill
                  sizes="84px"
                  className="object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-heading text-[17px]/[1.3] font-bold text-ink">
                  {member.title}
                </p>
                <p className="text-[13px]/[1.5] text-body">{member.subtitle}</p>
              </div>
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm/[1.3] font-semibold text-ink">
                {labels.followLabel}
              </p>
              <div className="flex gap-2.5">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="relative size-10"
                  >
                    <Image
                      src={social.icon}
                      alt=""
                      fill
                      sizes="40px"
                      className="rounded-full object-contain"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 max-md:hidden lg:flex-row">
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
