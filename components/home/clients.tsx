import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

export type ClientsProps = {
  eyebrow: string
  title: string
  clients: { name: string; logo: string }[]
}

export function Clients({ eyebrow, title, clients }: ClientsProps) {
  return (
    <section className="bg-white py-16 md:py-24">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow={eyebrow} title={title} />

        <ul data-stagger className="flex w-full flex-wrap justify-center gap-5">
          {clients.map((client) => (
            <li
              key={client.name}
              className="flex h-[120px] w-full items-center justify-center rounded-[20px] border border-line bg-white sm:w-[calc(50%-10px)] lg:w-[285px]"
            >
              <div className="relative h-[72px] w-[220px]">
                <Image
                  src={client.logo}
                  alt={client.name}
                  fill
                  sizes="220px"
                  className="object-contain"
                />
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
