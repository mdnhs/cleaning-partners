import { ClientsCarousel } from "@/components/home/clients-carousel"
import { Container, SectionHeading } from "@/components/home/section-heading"

export type ClientsProps = {
  eyebrow: string
  title: string
  clients: { name: string; logo: string }[]
}

export function Clients({ eyebrow, title, clients }: ClientsProps) {
  return (
    // No side padding on the section: the strip runs the full width of the
    // page; only the heading keeps the page margins.
    <section className="bg-white py-16 md:py-24">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} />
      </Container>
      <div className="mt-14">
        <ClientsCarousel label={title} clients={clients} />
      </div>
    </section>
  )
}
