import { Container, SectionHeading } from "@/components/home/section-heading"

const testimonials = [
  {
    name: "Thomas Murray",
    initials: "TM",
    quote:
      "Great service – easy to arrange, friendly people. The drapes look amazing, not a trace from the red wine stain. I am very happy! Will definitely be using their service again and will recommend to friends and family!",
  },
  {
    name: "Charlotte Smith",
    initials: "CS",
    quote:
      "We are happy with their consistently high standard of service and value the longstanding vendor relationship we have with Cleaning Partners Ltd. We happily recommend their services to any firm considering them for office cleaning services.",
  },
  {
    name: "Stephanie Lyon",
    initials: "SL",
    quote:
      "Cleaning Partners provides a reliable and efficient service for a very good price. I have tried many companies offering office cleaning and none of them matches their quality. Highly recommended!",
  },
]

export function Testimonials() {
  return (
    <section className="bg-white py-16 md:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow="TESTIMONIALS" title="What Our Customers Say" />

        <ul data-stagger className="grid w-full gap-6 lg:grid-cols-3">
          {testimonials.map((t) => (
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
                  aria-label="5 out of 5 stars"
                  className="text-lg text-star"
                >
                  ★★★★★
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
                    Verified customer
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
