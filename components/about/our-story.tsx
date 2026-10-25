import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { renderInline } from "@/lib/rich-text/render"
import type { ParagraphsDoc } from "@/lib/schemas/common"

type Picture = { src: string; alt: string }

export type OurStoryProps = {
  imageA: Picture
  imageB: Picture
  eyebrow: string
  title: string
  paragraphs: ParagraphsDoc
  sectorsHeading: string
  sectors: string[]
  cta: { label: string; href: string }
}

export function OurStory({
  imageA,
  imageB,
  eyebrow,
  title,
  paragraphs,
  sectorsHeading,
  sectors,
  cta,
}: OurStoryProps) {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div
          data-stagger
          className="flex w-full max-w-[580px] shrink-0 gap-5 lg:w-auto"
        >
          <div className="relative aspect-[280/440] flex-1 overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px] lg:flex-none">
            <Image
              src={imageA.src}
              alt={imageA.alt}
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex-1 pt-[60px] lg:flex-none">
            <div className="relative aspect-[280/440] overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px]">
              <Image
                src={imageB.src}
                alt={imageB.alt}
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
              {eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              {title}
            </h2>
          </div>

          {paragraphs.content.map((paragraph, i) => (
            <p
              key={i}
              data-reveal
              className="text-[17px] leading-[1.65] text-body"
            >
              {renderInline(paragraph.content)}
            </p>
          ))}

          <div data-reveal className="flex w-full flex-col gap-3">
            <h3 className="font-heading text-lg/[normal] font-bold text-ink">
              {sectorsHeading}
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
            href={cta.href}
            className={buttonVariants({ variant: "brand", size: "pill" })}
          >
            {cta.label}
          </a>
        </div>
      </Container>
    </section>
  )
}
