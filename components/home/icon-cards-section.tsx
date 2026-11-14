import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

export type IconCardsSectionProps = {
  eyebrow: string
  title: string
  description: string
  cards: { title: string; description: string; icon: string }[]
  /**
   * The photo behind the section ("Why choose us": white text on a blue
   * gradient, animated by the page story). Without it the cards sit on
   * white (the careers "Why work with us").
   */
  background?: string
}

/** A heading and up to eight icon cards (the reasons, the benefits). */
export function IconCardsSection(props: IconCardsSectionProps) {
  return props.background === undefined ? (
    <LightCards {...props} />
  ) : (
    <PhotoCards {...props} background={props.background} />
  )
}

function PhotoCards({
  background,
  eyebrow,
  title,
  description,
  cards,
}: IconCardsSectionProps & { background: string }) {
  return (
    <section
      data-story-track
      className="relative overflow-hidden py-12 sm:py-16 md:py-28"
    >
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

      <div data-story-stage>
        <Container className="flex flex-col items-center gap-6 sm:gap-14">
          <SectionHeading
            tone="inverted"
            eyebrow={eyebrow}
            title={title}
            description={description}
            className="max-sm:items-start max-sm:text-left"
          />

          {/* The line that fills while the reasons light up (page-story.ts). */}
          <div
            aria-hidden
            data-story-bar
            className="h-0.5 w-full max-w-[420px] origin-left rounded-full bg-white/70 max-sm:hidden"
          />

          <ul
            data-features
            className="grid w-full grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4"
          >
            {cards.map((card, i) => (
              <li
                key={i}
                data-story-card
                className="group flex min-h-[184px] flex-col items-start gap-2.5 rounded-[18px] border border-white/25 bg-white/10 p-4 text-left transition-[translate,background-color,border-color,box-shadow] duration-300 ease-out hover:border-white/50 hover:bg-white/20 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.28)] has-[a:focus-visible]:border-white/50 motion-safe:hover:-translate-y-1.5! sm:min-h-0 sm:items-center sm:gap-3.5 sm:rounded-3xl sm:px-6 sm:py-8 sm:text-center"
              >
                {/* 110px icon clipped to a 96×78 frame, top-aligned */}
                <div className="flex h-[42px] w-[52px] justify-start overflow-hidden transition-transform duration-300 ease-out motion-safe:group-hover:scale-110 sm:h-[78px] sm:w-24 sm:justify-center">
                  <div
                    data-feature-icon
                    className="relative size-[52px] shrink-0 sm:size-[110px]"
                  >
                    <Image
                      src={card.icon}
                      alt=""
                      fill
                      sizes="110px"
                      className="object-contain"
                    />
                  </div>
                </div>
                <h3 className="font-heading text-[17px]/[1.3] font-bold text-white sm:text-[22px]/[normal]">
                  {card.title}
                </h3>
                <p className="text-[13px] leading-[1.5] text-white/85 sm:text-[15px] sm:leading-[1.55]">
                  {card.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  )
}

function LightCards({
  eyebrow,
  title,
  description,
  cards,
}: IconCardsSectionProps) {
  return (
    <section className="bg-white py-12 md:py-28">
      <Container className="flex flex-col items-start gap-5 sm:items-center sm:gap-14">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="max-sm:items-start max-sm:text-left"
        />
        <ul
          data-stagger
          className="grid w-full grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4"
        >
          {cards.map((card, i) => (
            <li
              key={i}
              data-card="light"
              className="flex min-h-[216px] flex-col items-start gap-2.5 rounded-[18px] bg-surface p-4 sm:min-h-0 sm:gap-4 sm:rounded-3xl sm:border sm:border-line sm:bg-white sm:px-7 sm:py-8 sm:shadow-[0px_10px_30px_0px_rgba(13,28,51,0.05)]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand sm:size-14 sm:rounded-2xl">
                <Image
                  src={card.icon}
                  alt=""
                  width={26}
                  height={26}
                  className="size-5 sm:size-[26px]"
                />
              </span>
              <h3 className="font-heading text-[17px]/[1.3] font-bold text-ink sm:text-[22px]/[1.2]">
                {card.title}
              </h3>
              <p className="text-[13px] leading-[1.5] text-body sm:text-base sm:leading-[1.55]">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
