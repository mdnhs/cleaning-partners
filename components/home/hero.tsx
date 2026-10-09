import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"

export function Hero() {
  return (
    <section data-hero className="relative overflow-hidden">
      <div aria-hidden data-hero-bg className="absolute inset-0">
        <Image
          src="/images/home/hero.png"
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
        className="flex min-h-[700px] flex-col items-center justify-center gap-6 py-16 text-center"
      >
        <div
          data-intro
          data-hero-badge
          className="flex size-[180px] items-center justify-center rounded-full bg-white/92 md:size-[220px]"
        >
          <div className="relative h-[130px] w-[146px] md:h-40 md:w-[180px]">
            <Image
              src="/images/home/cleaning-partners-logo.png"
              alt="Cleaning Partners"
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
          className="font-heading text-[44px] leading-[1.05] font-bold text-white md:text-[64px]"
        >
          Cleaning Partners Ltd.
        </h1>
        <p
          data-intro
          data-hero-copy
          className="max-w-[640px] text-lg leading-[1.55] text-white/90 md:text-xl"
        >
          The Clean Team. Medical, commercial and domestic cleaning you can rely
          on, across the midlands and beyond.
        </p>

        <div
          data-intro
          data-hero-actions
          className="flex flex-wrap justify-center gap-4 pt-2"
        >
          <a
            href="#contact"
            className={buttonVariants({ variant: "brand", size: "pill" })}
          >
            Get a Free Quote
          </a>
          <a
            href="#services"
            className={buttonVariants({
              variant: "outline-light",
              size: "pill",
            })}
          >
            Our Services
          </a>
        </div>

        <div
          data-intro
          data-hero-member
          className="flex items-center gap-3 pt-3"
        >
          <p className="text-sm font-medium text-white/80">Proud member of</p>
          <div className="relative h-[42px] w-20">
            <Image
              src="/images/home/icca.png"
              alt="Irish Contract Cleaning Association"
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
