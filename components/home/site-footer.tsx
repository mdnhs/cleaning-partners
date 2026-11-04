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
  /** hrefs[i] is the destination of lines[i]; a missing or empty one is plain text. */
  contact: { title: string; lines: string[]; hrefs?: (string | null)[] }
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
  legal: {
    /** The published legal pages, in the admin's order. */
    pages: FooterLink[]
    login?: FooterLink
  }
}

const FOOTER_LINK_CLASS =
  "group/link inline-flex w-fit items-center text-[15px] leading-[1.5] [overflow-wrap:anywhere] text-white/80 transition-[color,translate] duration-300 ease-out hover:text-white focus-visible:text-white motion-safe:hover:translate-x-1 motion-safe:focus-visible:translate-x-1"

/**
 * A footer link that answers the pointer: a brand-coloured bar grows in
 * front of the text, the text brightens and slides a little to the right.
 * Page links use next/link; maps, phone and email are plain anchors.
 */
function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  const bar = (
    <span
      aria-hidden
      className="h-0.5 w-0 shrink-0 rounded-full bg-brand transition-[width,margin] duration-300 ease-out group-hover/link:mr-2 group-hover/link:w-3 group-focus-visible/link:mr-2 group-focus-visible/link:w-3"
    />
  )
  if (/^(https?:|mailto:|tel:)/.test(href))
    return (
      <a
        href={href}
        className={FOOTER_LINK_CLASS}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {bar}
        {children}
      </a>
    )
  return (
    <Link href={href} className={FOOTER_LINK_CLASS}>
      {bar}
      {children}
    </Link>
  )
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
    <footer className="relative isolate overflow-hidden bg-navy-dark pt-20 pb-8">
      <div
        aria-hidden="true"
        className="footer-aurora pointer-events-none absolute inset-0 -z-10"
      >
        <span />
        <span />
        <span />
      </div>
      <Container className="flex flex-col gap-12">
        <div
          data-stagger
          className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-12 lg:grid-cols-[340px_1fr_1fr_300px] lg:gap-14"
        >
          <div className="flex flex-col items-start gap-5 max-sm:col-span-2">
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
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </nav>

          <div className="flex flex-col gap-3.5">
            <ColumnTitle>{contact.title}</ColumnTitle>
            {contact.lines.map((line, index) => {
              const href = contact.hrefs?.[index]
              return href ? (
                <FooterLink
                  key={line}
                  href={href}
                  external={href.startsWith("http")}
                >
                  {line}
                </FooterLink>
              ) : (
                <p
                  key={line}
                  className="text-[15px] leading-[1.5] [overflow-wrap:anywhere] text-white/80"
                >
                  {line}
                </p>
              )
            })}
          </div>

          <div className="flex flex-col gap-4 max-sm:col-span-2">
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
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {[...legal.pages, ...(legal.login ? [legal.login] : [])].map(
              (link, index) => (
                <span key={link.href} className="contents">
                  {index > 0 ? <span aria-hidden>·</span> : null}
                  <Link
                    href={link.href}
                    className="underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </span>
              )
            )}
          </p>
        </div>
      </Container>
    </footer>
  )
}
