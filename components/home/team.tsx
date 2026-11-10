import Image from "next/image"

import { ScrollDots } from "@/components/home/scroll-dots"
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
    /**
     * null = no photo. `placeholder`: the shared placeholder image, drawn
     * with the design's crop; a real headshot fills the box (object-cover).
     */
    photo: { src: string; placeholder: boolean } | null
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
    <section
      id="team"
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
        <div className="absolute inset-0 bg-[rgba(20,50,74,0.92)]" />
      </div>

      <Container className="flex flex-col items-center gap-6 sm:gap-14">
        <SectionHeading
          tone="inverted"
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="max-sm:items-start max-sm:text-left"
        />

        <ul
          data-team-list
          className="flex w-[calc(100%+40px)] max-w-none snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-3 overflow-x-auto px-5 pb-4 sm:w-full sm:gap-6 sm:px-0 sm:pb-0 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
        >
          {members.map((member) => (
            <li
              key={member.name}
              data-card="light"
              className="flex w-[270px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-white shadow-[0px_10px_30px_0px_rgba(13,38,64,0.14)] md:w-auto md:rounded-3xl md:shadow-[0px_20px_40px_0px_rgba(0,0,0,0.18)]"
            >
              <div
                data-team-photo
                className="relative h-[210px] w-full overflow-hidden md:h-[300px]"
              >
                {member.photo?.placeholder ? (
                  // Matches Figma crop of the shared placeholder photo (186% tall, offset up)
                  <Image
                    src={member.photo.src}
                    alt={member.name}
                    width={720}
                    height={1047}
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="absolute top-[-14.95%] left-0 h-[186.13%] w-full max-w-none"
                  />
                ) : member.photo ? (
                  <Image
                    src={member.photo.src}
                    alt={member.name}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5 p-5 md:gap-3.5 md:px-7 md:pt-7 md:pb-8">
                <div className="flex flex-col gap-1.5 md:gap-1">
                  <h3 className="font-heading text-xl/[1.25] font-bold text-ink md:text-2xl/[normal]">
                    {member.name}
                  </h3>
                  <p className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-sm/[normal] md:font-semibold md:tracking-[1.12px]">
                    {member.role}
                  </p>
                </div>
                <p className="text-sm leading-[1.55] text-body md:text-[15px] md:leading-[1.65]">
                  {member.bio}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <ScrollDots
          target="[data-team-list]"
          count={members.length}
          className="w-full"
        />
      </Container>
    </section>
  )
}
