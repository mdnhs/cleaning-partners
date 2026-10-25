import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"

const paragraphs = [
  "With combined experience of over fifteen years, our objective has always been to provide a first-class service to all our customers. Since our establishment, we have greatly expanded and are continuously growing our customer base.",
  "We have a dedicated team of experienced, trained and long-standing staff who clean within a variety of sectors.",
  "Based in the Midlands, in our offices in Derryguile, Mountmellick, Co. Laois. This central hub allows us to provide services to homes and businesses across Ireland.",
]

const sectors = ["HSE", "County Council", "Retail", "Commercial", "Residential"]

export function OurStory() {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div
          data-stagger
          className="flex w-full max-w-[580px] shrink-0 gap-5 lg:w-auto"
        >
          <div className="relative aspect-[280/440] flex-1 overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px] lg:flex-none">
            <Image
              src="/images/home/cleaning-the-counter.png"
              alt="Cleaner wiping down a bathroom counter"
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex-1 pt-[60px] lg:flex-none">
            <div className="relative aspect-[280/440] overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px]">
              <Image
                src="/images/home/vacuuming.png"
                alt="Cleaner vacuuming an office"
                fill
                sizes="(min-width: 1024px) 280px, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-[22px]">
          <div className="flex w-full flex-col gap-3">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
            >
              WHO WE ARE
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              About Cleaning Partners
            </h2>
          </div>

          {paragraphs.map((text) => (
            <p
              key={text.slice(0, 24)}
              data-reveal
              className="text-[17px] leading-[1.65] text-body"
            >
              {text}
            </p>
          ))}

          <div data-reveal className="flex w-full flex-col gap-3">
            <h3 className="font-heading text-lg/[normal] font-bold text-ink">
              Sectors we clean in
            </h3>
            <ul className="flex flex-wrap gap-2.5">
              {sectors.map((sector) => (
                <li
                  key={sector}
                  className="rounded-full border border-line bg-surface px-[18px] py-2.5 font-heading text-[15px]/[normal] font-semibold text-navy"
                >
                  {sector}
                </li>
              ))}
            </ul>
          </div>

          <a
            data-reveal
            href="#contact"
            className={buttonVariants({ variant: "brand", size: "pill" })}
          >
            Get a Free Quote
          </a>
        </div>
      </Container>
    </section>
  )
}
