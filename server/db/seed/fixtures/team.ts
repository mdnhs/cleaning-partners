import "server-only"

import type { TeamMemberInput } from "@/lib/schemas/content/team-member"

import type { MediaLookup } from "./media"

/** components/home/team.tsx at 3689369. Display order = sortOrder; the photo is the design's temporary image. */
export function teamFixture(media: MediaLookup): TeamMemberInput[] {
  const photo = media("/images/home/team-temp.png")
  return [
    {
      name: "Michael McDonald",
      role: "MANAGING DIRECTOR",
      bio: "Michael saw the opportunity to provide a one stop shop service in cleaning and security, so he set up Cleaning Partners as a sister company to Security Partners.",
      photo,
    },
    {
      name: "John McDonald",
      role: "OPERATIONS DIRECTOR",
      bio: "John operationally runs the business on the ground day to day, getting teams set up and ensuring that a top quality job is completed.",
      photo,
    },
    {
      name: "Sarah Moran",
      role: "HR MANAGER",
      bio: "Sarah looks after all HR related tasks. She also looks after rostering and is the contracts manager for all clients.",
      photo,
    },
  ]
}
