import Image from "next/image"

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
    <section className="bg-white py-14 md:py-24">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          className="max-sm:gap-2.5"
          eyebrowClassName="max-sm:text-[13px] max-sm:tracking-[1.82px]"
          titleClassName="max-sm:text-[32px] max-sm:leading-[1.1] max-sm:tracking-normal"
        />
      </Container>
      {/* Phones: the logos stand still in a two-column grid. */}
      <Container className="mt-7 md:hidden">
        <ul data-stagger className="flex flex-wrap justify-center gap-4">
          {clients.map((client) => (
            <li
              key={client.name}
              className="flex h-20 w-[calc(50%-8px)] items-center justify-center rounded-2xl border border-line bg-white"
            >
              <span className="relative h-[43px] w-[132px] max-w-[80%]">
                <Image
                  src={client.logo}
                  alt={client.name}
                  fill
                  sizes="132px"
                  className="object-contain"
                />
              </span>
            </li>
          ))}
        </ul>
      </Container>
      <div className="mt-14 max-md:hidden">
        <ClientsCarousel label={title} clients={clients} />
      </div>
    </section>
  )
}
