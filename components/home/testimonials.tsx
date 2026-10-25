import { Container, SectionHeading } from "@/components/home/section-heading"

export type TestimonialsProps = {
  eyebrow: string
  title: string
  verifiedLabel: string
  items: {
    name: string
    initials: string
    quote: string
    /** One star glyph per rating point */
    stars: string
    starsAria: string
  }[]
}

export function Testimonials({
  eyebrow,
  title,
  verifiedLabel,
  items,
}: TestimonialsProps) {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow={eyebrow} title={title} />

        <ul data-stagger className="grid w-full gap-6 lg:grid-cols-3">
          {items.map((t) => (
            <li
              key={t.name}
              className="flex flex-col gap-[18px] rounded-3xl bg-surface px-8 py-9"
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className="font-heading text-[64px] leading-[0.6] font-extrabold text-brand"
                >
                  “
                </span>
                <span
                  role="img"
                  aria-label={t.starsAria}
                  className="text-lg text-star"
                >
                  {t.stars}
                </span>
              </div>
              <blockquote className="flex-1 text-base leading-[1.65] text-ink-soft">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-3.5 pt-[19px]">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-lg font-bold text-white">
                  {t.initials}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-heading text-lg/[normal] font-bold text-ink">
                    {t.name}
                  </p>
                  <p className="text-[13px]/[normal] text-body">
                    {verifiedLabel}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
