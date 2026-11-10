import { ScrollDots } from "@/components/home/scroll-dots"
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
    <section className="bg-white py-12 sm:py-16 md:py-28">
      <Container className="flex flex-col items-center gap-6 sm:gap-14">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          className="max-sm:items-start max-sm:text-left"
        />

        <div data-reveal className="w-full">
          <TestimonialsCarousel
            label={title}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            verifiedLabel={verifiedLabel}
            items={items}
          />
        </div>
        <ScrollDots
          target="[data-testimonial-track]"
          count={items.length}
          tone="dark"
          className="w-full sm:hidden"
        />
      </Container>
    </section>
  )
}
