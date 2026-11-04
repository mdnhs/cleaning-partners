import { TestimonialsCarousel } from "@/components/home/testimonials-carousel"
import { Container, SectionHeading } from "@/components/home/section-heading"

export type TestimonialsProps = {
  eyebrow: string
  title: string
  verifiedLabel: string
  prevLabel: string
  nextLabel: string
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
  prevLabel,
  nextLabel,
  items,
}: TestimonialsProps) {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow={eyebrow} title={title} />

        <div data-reveal className="w-full">
          <TestimonialsCarousel
            label={title}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            verifiedLabel={verifiedLabel}
            items={items}
          />
        </div>
      </Container>
    </section>
  )
}
