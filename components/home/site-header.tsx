"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
  MenuIcon,
  PhoneIcon,
  XIcon,
} from "lucide-react"

import { buttonClassName } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LogoAnimation } from "@/components/home/logo-animation"
import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

// `children`: a hover/focus list under the link (Services: one per service).
// `icon`: a picture shown beside a list entry (the service's own icon).
type NavLink = {
  label: string
  href: string
  children?: NavLink[]
  icon?: string
}

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
  closeMenuAria: string
  mobile: {
    helpTitle: string
    callLabel: string
    allServicesLabel: string
    directionsLabel: string
  }
}

/**
 * A header link with a list under it, open while the pointer or keyboard
 * focus is inside the link or the list, and dismissed with Escape (WCAG
 * 1.4.13: dismissible, hoverable, persistent). The link itself still goes to
 * its page. The list's top padding bridges the gap, so moving the pointer
 * down to it does not close it.
 */
function NavMenu({
  link,
  active,
  isActive,
}: {
  link: NavLink
  active: boolean
  isActive: (href: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLAnchorElement>(null)
  const dismissing = useRef(false)

  // Next keeps the page you left alive but hidden, state and all: a list left
  // open would still be open on the way back. A route change runs this
  // cleanup, so the list is closed when the page returns.
  useLayoutEffect(() => {
    return () => setOpen(false)
  }, [pathname])

  // Escape dismisses the list wherever the pointer or focus is.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setOpen(false)
      if (wrapRef.current?.contains(document.activeElement)) {
        dismissing.current = true
        topRef.current?.focus()
        dismissing.current = false
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="relative flex h-[60px] items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Any click in the link or the list is a navigation: close first.
      onClickCapture={() => setOpen(false)}
      onFocus={() => {
        if (!dismissing.current) setOpen(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false)
      }}
    >
      <Link
        ref={topRef}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "transition-colors hover:text-brand",
          active ? "font-bold text-brand" : "font-semibold text-ink"
        )}
      >
        {link.label}
      </Link>
      {/* Unrolls downward from the pointer (a clip that grows from the top),
          then the entries follow one after another; closing rolls it back up
          at once. The top padding bridges the way from the link. */}
      <div
        data-services-menu
        data-open={open}
        className="group/menu invisible absolute top-full left-1/2 z-10 min-w-76 -translate-x-1/2 pt-[22px] transition-[visibility] duration-[650ms] data-[open=true]:visible motion-reduce:transition-none"
      >
        <ul className="rounded-lg bg-white py-2 shadow-[0px_8px_30px_0px_rgba(13,38,64,0.14)] transition-[clip-path] duration-[650ms] ease-[cubic-bezier(0.45,0.05,0.25,1)] [clip-path:inset(0_-40px_100%_-40px)] group-data-[open=true]/menu:[clip-path:inset(0_-40px_-40px_-40px)] motion-reduce:transition-none">
          {link.children?.map((child, index) => (
            <li
              key={child.href}
              style={{
                transitionDelay: open ? `${180 + index * 70}ms` : "0ms",
              }}
              className="-translate-y-2 opacity-0 transition-[opacity,translate] duration-300 ease-out group-data-[open=true]/menu:translate-y-0 group-data-[open=true]/menu:opacity-100 motion-reduce:transition-none"
            >
              <Link
                href={child.href}
                aria-current={isActive(child.href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface hover:text-brand",
                  isActive(child.href) ? "text-brand" : "text-ink"
                )}
              >
                {child.icon ? (
                  // The service card's icon tile at menu size: the same brand
                  // square, rounded the same way, the icon half the tile.
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand"
                  >
                    <Image src={child.icon} alt="" width={22} height={22} />
                  </span>
                ) : null}
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
        {/* The pointer: a turned square whose upper half shows, centred on
            the list's top edge, popping in first. */}
        <span
          aria-hidden
          data-services-menu-arrow
          className="absolute top-[15px] left-1/2 z-10 size-3.5 -translate-x-1/2 scale-0 rotate-45 rounded-[2px] bg-white opacity-0 shadow-[-2px_-2px_6px_-3px_rgba(13,38,64,0.14)] transition-[opacity,scale] duration-200 ease-out group-data-[open=true]/menu:scale-100 group-data-[open=true]/menu:opacity-100 motion-reduce:transition-none"
        />
      </div>
    </div>
  )
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
  closeMenuAria,
  mobile,
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(true)
  // Past the very top the bar turns to blurred glass, so the page shows
  // through it as it scrolls underneath.
  const [scrolled, setScrolled] = useState(false)
  // The phone's fixed call/quote bar: shown once the hero is scrolled away.
  const [stickyCta, setStickyCta] = useState(false)
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8)
      const hero = document.querySelector<HTMLElement>("[data-hero]")
      const after = hero ? hero.offsetTop + hero.offsetHeight : 320
      setStickyCta(window.scrollY > after - 80)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [pathname])

  return (
    <>
      <div
        id="top"
        className="bg-navy text-xs/[normal] sm:text-[13px]/[normal]"
      >
        <Container className="flex items-center justify-between gap-4 py-[9px] sm:py-2.5">
          <div className="flex gap-7">
            <a
              href={topBar.phoneHref}
              className="flex items-center gap-1.5 font-medium text-white"
            >
              <PhoneIcon aria-hidden className="size-[13px] sm:hidden" />
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

      <header
        className={cn(
          "sticky top-0 z-50 shadow-[0px_4px_20px_0px_rgba(13,38,64,0.08)] transition-[background-color,backdrop-filter] duration-300 motion-reduce:transition-none",
          scrolled
            ? "bg-white/55 backdrop-blur-lg backdrop-saturate-150"
            : "bg-white"
        )}
      >
        <Container className="flex items-center justify-between py-2.5">
          <Link
            href={logo.href}
            className="relative h-[50px] w-14 shrink-0 sm:h-[60px] sm:w-[68px]"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="68px"
              className="object-contain"
              preload
            />
            {logo.animation ? <LogoAnimation src={logo.animation} /> : null}
          </Link>

          <nav className="hidden items-center gap-9 font-heading text-[17px] lg:flex">
            {links.map((link) => {
              const active = isActiveHref(pathname, link.href)
              return link.children?.length ? (
                <NavMenu
                  key={link.href}
                  link={link}
                  active={active}
                  isActive={(href) => isActiveHref(pathname, href)}
                />
              ) : (
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

          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href={topBar.phoneHref}
              aria-label={topBar.phone}
              className="inline-flex size-11 items-center justify-center rounded-full border border-line text-brand hover:bg-surface lg:hidden"
            >
              <PhoneIcon aria-hidden className="size-5" />
            </a>
            <a
              href={cta.href}
              className={buttonClassName(
                { variant: "brand", size: "pill" },
                "max-lg:hidden"
              )}
            >
              {cta.label}
            </a>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                aria-label={menuAria}
                className="inline-flex size-11 items-center justify-center rounded-full bg-brand text-white hover:bg-brand/90 lg:hidden"
              >
                <MenuIcon className="size-[22px]" />
              </SheetTrigger>
              <SheetContent
                side="right"
                showCloseButton={false}
                data-lenis-prevent
                className="w-full gap-0 bg-white p-0 text-ink sm:w-[24rem] lg:hidden"
              >
                <SheetHeader className="flex-row items-center justify-between border-b border-line px-5 py-2.5">
                  <SheetTitle className="sr-only">{menuAria}</SheetTitle>
                  <span aria-hidden className="relative h-[50px] w-14">
                    <Image
                      src={logo.src}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  </span>
                  <SheetClose
                    aria-label={closeMenuAria}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink hover:bg-brand-soft"
                  >
                    <XIcon className="size-[22px]" />
                  </SheetClose>
                </SheetHeader>
                <nav
                  aria-label={menuAria}
                  className="flex flex-1 flex-col overflow-y-auto px-5 py-2 font-heading text-xl"
                >
                  {links.map((link) => {
                    const active = isActiveHref(pathname, link.href)
                    const rowClass = cn(
                      "flex items-center justify-between py-4 text-left leading-[normal]",
                      active ? "font-bold text-brand" : "font-semibold text-ink"
                    )
                    if (link.children?.length) {
                      return (
                        <div key={link.href}>
                          <button
                            type="button"
                            aria-expanded={servicesOpen}
                            onClick={() => setServicesOpen((v) => !v)}
                            className={cn(rowClass, "w-full")}
                          >
                            {link.label}
                            {servicesOpen ? (
                              <ChevronDownIcon
                                aria-hidden
                                className="size-5 text-body"
                              />
                            ) : (
                              <ChevronRightIcon
                                aria-hidden
                                className="size-5 text-body"
                              />
                            )}
                          </button>
                          {servicesOpen ? (
                            <ul className="flex flex-col gap-0.5 border-b border-line pb-3 pl-3.5 font-sans text-[15px]">
                              {[
                                ...link.children,
                                {
                                  label: mobile.allServicesLabel,
                                  href: link.href,
                                  all: true,
                                },
                              ].map((child) => (
                                <li key={child.href + child.label}>
                                  <SheetClose
                                    nativeButton={false}
                                    render={
                                      <Link
                                        href={child.href}
                                        className={cn(
                                          "flex items-center gap-2.5 py-2 hover:text-brand",
                                          "all" in child
                                            ? "leading-[1.45] font-medium text-navy"
                                            : "leading-[1.6] text-body"
                                        )}
                                      />
                                    }
                                  >
                                    <span
                                      aria-hidden
                                      className="size-1.5 shrink-0 rounded-full bg-brand"
                                    />
                                    {child.label}
                                  </SheetClose>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="border-b border-line" />
                          )}
                        </div>
                      )
                    }
                    return (
                      <SheetClose
                        key={link.href}
                        nativeButton={false}
                        render={
                          <Link
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              rowClass,
                              "border-b border-line hover:text-brand"
                            )}
                          />
                        }
                      >
                        {link.label}
                        <ChevronRightIcon
                          aria-hidden
                          className={cn(
                            "size-5",
                            active ? "text-brand" : "text-body"
                          )}
                        />
                      </SheetClose>
                    )
                  })}
                </nav>
                <div className="flex flex-col gap-3.5 bg-surface px-5 pt-5 pb-7">
                  <p className="font-heading text-lg/[normal] font-bold">
                    {mobile.helpTitle}
                  </p>
                  <ul className="flex flex-col gap-2 text-sm/[1.55] text-body">
                    {[
                      {
                        Icon: PhoneIcon,
                        text: topBar.phone,
                        href: topBar.phoneHref,
                      },
                      {
                        Icon: MailIcon,
                        text: topBar.email,
                        href: topBar.emailHref,
                      },
                      { Icon: ClockIcon, text: topBar.hours, href: undefined },
                    ].map(({ Icon, text, href }) => (
                      <li key={text} className="flex items-center gap-2.5">
                        <Icon aria-hidden className="size-[18px] text-brand" />
                        {href ? <a href={href}>{text}</a> : text}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2.5">
                    <a
                      href={topBar.phoneHref}
                      className={buttonClassName(
                        { variant: "outline-navy", size: "pill" },
                        "min-w-0 flex-1 gap-2 px-4"
                      )}
                    >
                      <PhoneIcon aria-hidden className="size-5" />
                      {mobile.callLabel}
                    </a>
                    <SheetClose
                      nativeButton={false}
                      render={
                        <Link
                          href={cta.href}
                          className={buttonClassName(
                            { variant: "brand", size: "pill" },
                            "min-w-0 flex-1 px-4"
                          )}
                        />
                      }
                    >
                      {cta.label}
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Container>
      </header>
      <div
        data-sticky-cta
        aria-hidden={!stickyCta}
        inert={!stickyCta}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex gap-2.5 bg-white px-4 pt-3 pb-6 shadow-[0px_-6px_12px_0px_rgba(13,38,64,0.12)] transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden",
          stickyCta ? "translate-y-0" : "translate-y-full"
        )}
      >
        <a
          href={topBar.phoneHref}
          className={buttonClassName(
            { variant: "outline-navy", size: "pill" },
            "min-w-0 flex-1 gap-2 px-4"
          )}
        >
          <PhoneIcon aria-hidden className="size-5" />
          {mobile.callLabel}
        </a>
        <a
          href={cta.href}
          className={buttonClassName(
            { variant: "brand", size: "pill" },
            "min-w-0 flex-1 px-4"
          )}
        >
          {cta.label}
        </a>
      </div>
    </>
  )
}
