"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { LogoAnimation } from "@/components/home/logo-animation"
import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

type NavLink = { label: string; href: string }

export type SiteHeaderProps = {
  topBar: {
    phone: string
    phoneHref: string
    email: string
    emailHref: string
    hours: string
  }
  /** animation: Lottie file URL (settings.site.logoAnimation); absent = none */
  logo: { src: string; alt: string; href: string; animation?: string }
  links: NavLink[]
  cta: NavLink
  menuAria: string
}

/**
 * A link is active when its href is the current path or a parent of it
 * (/services is active on /services/medical-cleaning). The home link only
 * matches "/" itself. Matched by href, never by label (R3-6).
 */
function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader({
  topBar,
  logo,
  links,
  cta,
  menuAria,
}: SiteHeaderProps) {
  const pathname = usePathname()

  return (
    <header id="top" data-intro data-header className="relative z-50">
      <div className="bg-navy text-[13px]/[normal]">
        <Container className="flex items-center justify-between gap-4 py-2.5">
          <div className="flex gap-7">
            <a href={topBar.phoneHref} className="font-medium text-white">
              {topBar.phone}
            </a>
            <a
              href={topBar.emailHref}
              className="hidden text-white/80 hover:text-white sm:inline"
            >
              {topBar.email}
            </a>
          </div>
          <p className="text-white/80">{topBar.hours}</p>
        </Container>
      </div>

      <div className="bg-white shadow-[0px_4px_20px_0px_rgba(13,38,64,0.08)]">
        <Container className="flex items-center justify-between py-3">
          <Link href={logo.href} className="relative h-[72px] w-20 shrink-0">
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="80px"
              className="object-contain"
              preload
            />
            {logo.animation ? <LogoAnimation src={logo.animation} /> : null}
          </Link>

          <nav className="hidden items-center gap-9 font-heading text-[17px] lg:flex">
            {links.map((link) => {
              const active = isActiveHref(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "transition-colors hover:text-brand",
                    active ? "font-bold text-brand" : "font-semibold text-ink"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={cta.href}
              className={buttonVariants({ variant: "brand", size: "pill" })}
            >
              {cta.label}
            </a>
            <details className="group relative lg:hidden">
              <summary
                aria-label={menuAria}
                className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-ink hover:bg-surface [&::-webkit-details-marker]:hidden"
              >
                <MenuIcon className="size-6" />
              </summary>
              <nav className="absolute top-full right-0 mt-3 flex w-48 flex-col rounded-2xl border border-line bg-white p-2 font-heading text-[17px] font-semibold text-ink shadow-[0px_10px_30px_0px_rgba(13,38,64,0.12)]">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-2.5 hover:bg-surface hover:text-brand"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </Container>
      </div>
    </header>
  )
}
