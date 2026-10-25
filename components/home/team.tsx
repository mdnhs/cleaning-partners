import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

export type TeamProps = {
  background: string
  eyebrow: string
  title: string
  description: string
  members: {
    name: string
    role: string
    bio: string
    /** Image URL; null = no photo */
    photo: string | null
  }[]
}

export function Team({
  background,
  eyebrow,
  title,
  description,
  members,
}: TeamProps) {
  return (
    <section id="team" className="relative overflow-hidden py-16 md:py-28">
      <div aria-hidden className="absolute inset-0">
        <Image
          src={background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          data-parallax
        />
        <div className="absolute inset-0 bg-[rgba(20,50,74,0.92)]" />
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
          className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {members.map((member) => (
            <li
              key={member.name}
              className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0px_20px_40px_0px_rgba(0,0,0,0.18)]"
            >
              <div
                data-team-photo
                className="relative h-[300px] w-full overflow-hidden"
              >
                {member.photo && (
                  // Matches Figma crop of the shared photo (186% tall, offset up)
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={720}
                    height={1047}
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="absolute top-[-14.95%] left-0 h-[186.13%] w-full max-w-none"
                  />
                )}
              </div>
              <div className="flex flex-col gap-3.5 px-7 pt-7 pb-8">
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-2xl/[normal] font-bold text-ink">
                    {member.name}
                  </h3>
                  <p className="font-heading text-sm/[normal] font-semibold tracking-[1.12px] text-brand">
                    {member.role}
                  </p>
                </div>
                <p className="text-[15px] leading-[1.65] text-body">
                  {member.bio}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
