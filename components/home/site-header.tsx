import Image from "next/image"
import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

type NavLabel = (typeof navLinks)[number]["label"]

export function SiteHeader({ active = "Home" }: { active?: NavLabel }) {
  return (
    <header id="top" data-intro data-header className="relative z-50">
      <div className="bg-navy text-[13px]/[normal]">
        <Container className="flex items-center justify-between gap-4 py-2.5">
          <div className="flex gap-7">
            <a href="tel:+353858062369" className="font-medium text-white">
              24hr contact: (085) 8062369
            </a>
            <a
              href="mailto:info@cleaningpartners.ie"
              className="hidden text-white/80 hover:text-white sm:inline"
            >
              info@cleaningpartners.ie
            </a>
          </div>
          <p className="text-white/80">Mon–Fri: 9am – 6pm</p>
        </Container>
      </div>

      <div className="bg-white shadow-[0px_4px_20px_0px_rgba(13,38,64,0.08)]">
        <Container className="flex items-center justify-between py-3">
          <Link href="/" className="relative h-[72px] w-20 shrink-0">
            <Image
              src="/images/home/logo.png"
              alt="Cleaning Partners"
              fill
              sizes="80px"
              className="object-contain"
              preload
            />
          </Link>

          <nav className="hidden items-center gap-9 font-heading text-[17px] lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={link.label === active ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-brand",
                  link.label === active
                    ? "font-bold text-brand"
                    : "font-semibold text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className={buttonVariants({ variant: "brand", size: "pill" })}
            >
              Get a Quote
            </a>
            <details className="group relative lg:hidden">
              <summary
                aria-label="Open menu"
                className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-ink hover:bg-surface [&::-webkit-details-marker]:hidden"
              >
                <MenuIcon className="size-6" />
              </summary>
              <nav className="absolute top-full right-0 mt-3 flex w-48 flex-col rounded-2xl border border-line bg-white p-2 font-heading text-[17px] font-semibold text-ink shadow-[0px_10px_30px_0px_rgba(13,38,64,0.12)]">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
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
