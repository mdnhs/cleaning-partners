import Image from "next/image"
import Link from "next/link"

import { LogoAnimation } from "@/components/home/logo-animation"
import { Container } from "@/components/home/section-heading"

type FooterLink = { label: string; href: string }

export type SiteFooterProps = {
  /** animation: Lottie file URL (settings.site.logoAnimation); absent = none */
  logo: { src: string; alt: string; animation?: string }
  tagline: string
  quickLinks: { title: string; links: FooterLink[] }
  contact: { title: string; lines: string[] }
  group: {
    title: string
    companies: {
      name: string
      phone: string
      site: string
      href: string
      logo: string
    }[]
  }
  copyright: string
  legal: { privacy: FooterLink; terms: FooterLink }
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-base/[normal] font-bold tracking-[1.28px] text-brand">
      {children}
    </p>
  )
}

export function SiteFooter({
  logo,
  tagline,
  quickLinks,
  contact,
  group,
  copyright,
  legal,
}: SiteFooterProps) {
  return (
    <footer className="bg-navy-dark pt-20 pb-8">
      <Container className="flex flex-col gap-12">
        <div
          data-stagger
          className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[340px_1fr_1fr_300px] lg:gap-14"
        >
          <div className="flex flex-col items-start gap-5">
            <div className="rounded-2xl bg-white px-3 py-2">
              <div className="relative h-[76px] w-[84px]">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  sizes="84px"
                  className="object-contain"
                />
                {logo.animation ? <LogoAnimation src={logo.animation} /> : null}
              </div>
            </div>
            <p className="text-[15px] leading-[1.65] text-white/70">
              {tagline}
            </p>
          </div>

          <nav className="flex flex-col gap-3.5">
            <ColumnTitle>{quickLinks.title}</ColumnTitle>
            {quickLinks.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[15px] leading-[1.5] text-white/80 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3.5">
            <ColumnTitle>{contact.title}</ColumnTitle>
            {contact.lines.map((line) => (
              <p key={line} className="text-[15px] leading-[1.5] text-white/80">
                {line}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <ColumnTitle>{group.title}</ColumnTitle>
            {group.companies.map((company) => (
              <a
                key={company.name}
                href={company.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3.5 rounded-2xl bg-white/7 px-4 py-3.5 transition-colors hover:bg-white/12"
              >
                <div className="flex h-14 w-[72px] shrink-0 items-center justify-center rounded-[10px] bg-white p-1.5">
                  <div className="relative h-11 w-[60px]">
                    <Image
                      src={company.logo}
                      alt=""
                      fill
                      sizes="60px"
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-heading text-base/[normal] font-bold text-white">
                    {company.name}
                  </p>
                  <p className="text-[13px]/[normal] text-white/70">
                    {company.phone}
                  </p>
                  <p className="text-[13px]/[normal] text-white/70">
                    {company.site}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-white/12" />

        <div className="flex flex-col justify-between gap-2 text-sm/[normal] text-white/60 sm:flex-row">
          <p>{copyright}</p>
          <p className="flex gap-3">
            <Link href={legal.privacy.href} className="hover:text-white">
              {legal.privacy.label}
            </Link>
            <span aria-hidden>·</span>
            <Link href={legal.terms.href} className="hover:text-white">
              {legal.terms.label}
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  )
}
