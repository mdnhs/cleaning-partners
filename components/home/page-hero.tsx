import { Fragment } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Container } from "@/components/home/section-heading"

type Crumb = { label: string; href: string }

export type PageHeroProps = {
  crumb: string
  /** Pages between Home and the current one */
  parents?: Crumb[]
  title: string
  description: string
  image: string
  /** The breadcrumb's first crumb */
  home: Crumb
  /** Accessible name of the breadcrumb */
  ariaLabel: string
}

export function PageHero({
  crumb,
  parents = [],
  title,
  description,
  image,
  home,
  ariaLabel,
}: PageHeroProps) {
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          preload
        />
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(40,100,143,0.55)] to-[rgba(15,47,71,0.8)]" />
      </div>

      <Container
        data-hero-content
        className="flex flex-col items-start gap-2.5 pt-6 pb-8 text-left sm:min-h-[460px] sm:items-center sm:justify-center sm:gap-5 sm:py-16 sm:text-center"
      >
        <nav
          aria-label={ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap items-center gap-1.5 text-[13px] leading-normal sm:justify-center sm:gap-2.5 sm:rounded-full sm:bg-white/14 sm:px-[18px] sm:py-2 sm:font-heading sm:text-[15px]/[normal]"
        >
          {[home, ...parents].map((parent) => (
            <Fragment key={parent.href}>
              <Link
                href={parent.href}
                className="font-medium text-white/70 transition-colors hover:text-white sm:text-white/80"
              >
                {parent.label}
              </Link>
              <ChevronRightIcon
                aria-hidden
                className="size-3.5 text-white/70 sm:hidden"
              />
              <span
                aria-hidden
                className="font-medium text-white/50 max-sm:hidden"
              >
                /
              </span>
            </Fragment>
          ))}
          <span aria-current="page" className="font-bold text-white">
            {crumb}
          </span>
        </nav>

        <h1
          data-intro
          data-hero-title
          className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.16px] text-white sm:text-[44px] sm:leading-[normal] sm:tracking-normal md:text-[64px]"
        >
          {title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[720px] text-base leading-[1.6] text-white/90 sm:text-lg sm:leading-[1.5] sm:text-white/92 md:text-xl"
        >
          {description}
        </p>
      </Container>
    </section>
  )
}
