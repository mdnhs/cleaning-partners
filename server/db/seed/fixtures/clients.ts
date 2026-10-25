import "server-only"

import type { ClientInput } from "@/lib/schemas/content/client"

import type { MediaLookup } from "./media"

/** components/home/clients.tsx at 3689369. Display order = sortOrder; the logo alt is the client name. */
export function clientsFixture(media: MediaLookup): ClientInput[] {
  return [
    { name: "HSE", logo: media("/images/home/client-hse.png"), url: null },
    {
      name: "Department of Education",
      logo: media("/images/home/client-department-of-education.png"),
      url: null,
    },
    { name: "IDS", logo: media("/images/home/client-ids.png"), url: null },
    {
      name: "Martin Reddin",
      logo: media("/images/home/client-martin-reddin.png"),
      url: null,
    },
    { name: "Ortus", logo: media("/images/home/client-ortus.png"), url: null },
    { name: "OPW", logo: media("/images/home/client-opw.png"), url: null },
    {
      name: "ALS Life Sciences",
      logo: media("/images/home/client-als.png"),
      url: null,
    },
  ]
}
