import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { HeroVideo } from "@/components/home/hero-video"
import { Container } from "@/components/home/section-heading"

type CtaLink = { label: string; href: string }

export type HeroProps = {
  background: string
  /** MP4/WebM URL played muted over `background` (the image is its poster). */
  backgroundVideo?: string
  logo: { src: string; alt: string }
  title: string
  subtitle: string
  primaryCta: CtaLink
  secondaryCta: CtaLink
  member: { label: string; logo: string; logoAlt: string }
}

export function Hero({
  background,
  backgroundVideo,
  logo,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  member,
}: HeroProps) {
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src={background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          preload
        />
        {backgroundVideo ? <HeroVideo src={backgroundVideo} /> : null}
        <div className="absolute inset-0 bg-linear-to-b from-[rgba(40,100,143,0.55)] to-[rgba(15,47,71,0.8)]" />
      </div>

      <Container
        data-hero-content
        className="flex min-h-0 flex-col items-center justify-center gap-[18px] pt-9 pb-10 text-center sm:min-h-[700px] sm:gap-6 sm:py-16"
      >
        <div
          data-intro
          data-hero-badge
          className="flex size-28 items-center justify-center rounded-full bg-white/92 sm:size-[180px] md:size-[220px]"
        >
          <div className="relative h-[82px] w-[92px] sm:h-[130px] sm:w-[146px] md:h-40 md:w-[180px]">
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="180px"
              className="object-contain"
              preload
            />
          </div>
        </div>

        <h1
          data-intro
          data-hero-title
          className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.16px] text-white sm:text-[44px] sm:leading-[1.05] md:text-[64px]"
        >
          {title}
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[640px] text-base leading-[1.6] text-white/90 sm:text-lg sm:leading-[1.55] md:text-xl"
        >
          {subtitle}
        </p>

        <div
          data-intro
          data-hero-actions
          className="flex w-full flex-wrap justify-center gap-[10px] sm:w-auto sm:gap-4 sm:pt-2"
        >
          <a
            href={primaryCta.href}
            className={buttonVariants({
              variant: "brand",
              size: "pill",
              className: "max-sm:w-full",
            })}
          >
            {primaryCta.label}
          </a>
          <a
            href={secondaryCta.href}
            className={buttonVariants({
              variant: "outline-light",
              size: "pill",
              className: "max-sm:w-full",
            })}
          >
            {secondaryCta.label}
          </a>
        </div>

        <div
          data-intro
          data-hero-member
          className="flex items-center gap-3 pt-3 max-sm:pt-3"
        >
          <p className="text-sm font-medium text-white/80">{member.label}</p>
          <div className="relative h-[42px] w-20">
            <Image
              src={member.logo}
              alt={member.logoAlt}
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
        </div>
      </Container>
    </section>
  )
}
