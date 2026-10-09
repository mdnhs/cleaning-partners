import Image from "next/image"
import Link from "next/link"

import { Container } from "@/components/home/section-heading"
import { navLinks } from "@/components/home/site-header"

const contactLines = [
  "Derryguile, Mountmellick",
  "Co. Laois, R32 YX49",
  "Tel: 057 8697670 Ext 4",
  "info@cleaningpartners.ie",
]

const groupCompanies = [
  {
    name: "Security Partners",
    phone: "Tel: (085) 8591299",
    site: "www.securitypartnersltd.ie",
    logo: "/images/home/security-partners.png",
  },
  {
    name: "MJS Eco",
    phone: "Tel: 087 294 8880",
    site: "www.mjseco.ie",
    logo: "/images/home/mjs-eco.png",
  },
]

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-base font-bold tracking-[1.28px] text-brand">
      {children}
    </p>
  )
}

export function SiteFooter() {
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
                  src="/images/home/logo.png"
                  alt="Cleaning Partners"
                  fill
                  sizes="84px"
                  className="object-contain"
                />
              </div>
            </div>
            <p className="text-[15px] leading-[1.65] text-white/70">
              The Clean Team. Medical, commercial and domestic cleaning from
              Mountmellick, Co. Laois.
            </p>
          </div>

          <nav className="flex flex-col gap-3.5">
            <ColumnTitle>QUICK LINKS</ColumnTitle>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[15px] leading-[1.5] text-white/80 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3.5">
            <ColumnTitle>CONTACT</ColumnTitle>
            {contactLines.map((line) => (
              <p key={line} className="text-[15px] leading-[1.5] text-white/80">
                {line}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <ColumnTitle>OTHER SERVICES IN THE GROUP</ColumnTitle>
            {groupCompanies.map((company) => (
              <a
                key={company.name}
                href={`https://${company.site}`}
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
                  <p className="font-heading text-base font-bold text-white">
                    {company.name}
                  </p>
                  <p className="text-[13px] text-white/70">{company.phone}</p>
                  <p className="text-[13px] text-white/70">{company.site}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-white/12" />

        <div className="flex flex-col justify-between gap-2 text-sm text-white/60 sm:flex-row">
          <p>© 2026 Cleaning Partners Ltd. All rights reserved.</p>
          <p className="flex gap-3">
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <Link href="#" className="hover:text-white">
              Terms
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  )
}
