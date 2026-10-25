import "server-only"

import type { TestimonialInput } from "@/lib/schemas/content/testimonial"

/** components/home/testimonials.tsx at 3689369. Display order = sortOrder; every rating is 5 stars. */
export function testimonialsFixture(): TestimonialInput[] {
  return [
    {
      name: "Thomas Murray",
      initials: "TM",
      quote:
        "Great service – easy to arrange, friendly people. The drapes look amazing, not a trace from the red wine stain. I am very happy! Will definitely be using their service again and will recommend to friends and family!",
      rating: 5,
    },
    {
      name: "Charlotte Smith",
      initials: "CS",
      quote:
        "We are happy with their consistently high standard of service and value the longstanding vendor relationship we have with Cleaning Partners Ltd. We happily recommend their services to any firm considering them for office cleaning services.",
      rating: 5,
    },
    {
      name: "Stephanie Lyon",
      initials: "SL",
      quote:
        "Cleaning Partners provides a reliable and efficient service for a very good price. I have tried many companies offering office cleaning and none of them matches their quality. Highly recommended!",
      rating: 5,
    },
  ]
}
