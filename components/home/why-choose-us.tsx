import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

export type WhyChooseUsProps = {
  background: string
  eyebrow: string
  title: string
  description: string
  features: { title: string; description: string; icon: string }[]
}

export function WhyChooseUs({
  background,
  eyebrow,
  title,
  description,
  features,
}: WhyChooseUsProps) {
  return (
    <section className="relative overflow-hidden py-16 md:py-28">
      <div aria-hidden className="absolute inset-0">
        <Image
          src={background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          data-parallax
        />
        <div className="absolute inset-0 bg-linear-to-r from-[rgba(40,100,143,0.95)] to-[rgba(70,130,180,0.85)]" />
      </div>

      <Container className="flex flex-col items-center gap-14">
        <SectionHeading
          tone="inverted"
          eyebrow={eyebrow}
          title={title}
          description={description}
        />

        <ul
          data-stagger
          data-features
          className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col items-center gap-3.5 rounded-3xl border border-white/25 bg-white/10 px-6 py-8 text-center"
            >
              {/* 110px icon clipped to a 96×78 frame, top-aligned */}
              <div className="flex h-[78px] w-24 justify-center overflow-hidden">
                <div
                  data-feature-icon
                  className="relative size-[110px] shrink-0"
                >
                  <Image
                    src={feature.icon}
                    alt=""
                    fill
                    sizes="110px"
                    className="object-contain"
                  />
                </div>
              </div>
              <h3 className="font-heading text-[22px]/[normal] font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-[15px] leading-[1.55] text-white/85">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
