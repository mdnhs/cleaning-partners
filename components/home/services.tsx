import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

type Picture = { src: string; alt: string }

export type ServicesProps = {
  imageA: Picture
  imageB: Picture
  eyebrow: string
  title: string
  description: string
  items: { title: string; description: string }[]
  itemIcon: string
  moreText: string
  cta: { label: string; href: string }
}

export function Services({
  imageA,
  imageB,
  eyebrow,
  title,
  description,
  items,
  itemIcon,
  moreText,
  cta,
}: ServicesProps) {
  return (
    <section
      id="services"
      data-services
      className="bg-surface py-16 md:py-28 lg:flex lg:min-h-svh lg:items-center"
    >
      <Container className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex w-full max-w-[580px] shrink-0 gap-5 lg:w-auto">
          <div
            data-services-img="a"
            className="relative aspect-[280/440] flex-1 overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px] lg:flex-none"
          >
            <Image
              src={imageA.src}
              alt={imageA.alt}
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="object-cover"
            />
          </div>
          <div className="flex-1 pt-[60px] lg:flex-none">
            <div
              data-services-img="b"
              className="relative aspect-[280/440] overflow-hidden rounded-[28px] lg:h-[440px] lg:w-[280px]"
            >
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

        <div className="flex min-w-0 flex-1 flex-col items-start gap-6">
          <SectionHeading
            align="left"
            eyebrow={eyebrow}
            title={title}
            description={description}
          />

          <ul className="flex w-full flex-col gap-3.5">
            {items.map((service) => (
              <li
                key={service.title}
                data-service-item
                className="flex items-center gap-4 rounded-[18px] border border-line bg-white px-5 py-[18px]"
              >
                <Image
                  src={itemIcon}
                  alt=""
                  width={26}
                  height={26}
                  className="shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="font-heading text-xl font-bold text-ink">
                    {service.title}
                  </h3>
                  <p className="text-[15px] leading-[1.5] text-body">
                    {service.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div data-services-more className="flex flex-col items-start gap-6">
            <p className="text-base text-body italic">{moreText}</p>
            <Link
              href={cta.href}
              className={buttonVariants({ variant: "navy", size: "pill" })}
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
