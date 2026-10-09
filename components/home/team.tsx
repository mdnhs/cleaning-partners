import Image from "next/image"

import { Container, SectionHeading } from "@/components/home/section-heading"

// Temp photo used for every member until real headshots are supplied.
const TEMP_PHOTO = "/images/home/team-temp.png"

const team = [
  {
    name: "Michael McDonald",
    role: "MANAGING DIRECTOR",
    bio: "Michael saw the opportunity to provide a one stop shop service in cleaning and security, so he set up Cleaning Partners as a sister company to Security Partners.",
    photo: TEMP_PHOTO,
  },
  {
    name: "John McDonald",
    role: "OPERATIONS DIRECTOR",
    bio: "John operationally runs the business on the ground day to day, getting teams set up and ensuring that a top quality job is completed.",
    photo: TEMP_PHOTO,
  },
  {
    name: "Sarah Moran",
    role: "HR MANAGER",
    bio: "Sarah looks after all HR related tasks. She also looks after rostering and is the contracts manager for all clients.",
    photo: TEMP_PHOTO,
  },
]

export function Team() {
  return (
    <section id="team" className="relative overflow-hidden py-16 md:py-28">
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/images/home/meet-the-team.png"
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
          eyebrow="OUR PEOPLE"
          title="Meet The Team"
          description="The family behind Cleaning Partners, sister company to Security Partners."
        />

        <ul
          data-stagger
          className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {team.map((member) => (
            <li
              key={member.name}
              className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0px_20px_40px_0px_rgba(0,0,0,0.18)]"
            >
              <div
                data-team-photo
                className="relative h-[300px] w-full overflow-hidden"
              >
                {member.photo === TEMP_PHOTO ? (
                  // Matches Figma crop of the temp photo (186% tall, offset up)
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={720}
                    height={1047}
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="absolute top-[-14.95%] left-0 h-[186.13%] w-full max-w-none"
                  />
                ) : (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-3.5 px-7 pt-7 pb-8">
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-2xl font-bold text-ink">
                    {member.name}
                  </h3>
                  <p className="font-heading text-sm font-semibold tracking-[1.12px] text-brand">
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
