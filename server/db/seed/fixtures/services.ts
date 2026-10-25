import "server-only"

import type { Seo } from "@/lib/schemas/common"
import type { ServiceContent } from "@/lib/schemas/content/service"

import type { MediaLookup } from "./media"
import { paragraphs } from "./rich-text"

export type ServiceFixture = { slug: string; content: ServiceContent; seo: Seo }

/** Copied verbatim from lib/services.ts at 3689369. Display order = sortOrder. */
export function servicesFixture(media: MediaLookup): ServiceFixture[] {
  return [
    {
      slug: "medical-cleaning",
      seo: {},
      content: {
        title: "Medical Cleaning",
        icon: media("/images/services/icon-medical.svg"),
        cover: media("/images/home/cleaning-the-counter.png"),
        summary:
          "We understand the importance of the high standard of cleaning required within hospitals and health centres. We currently clean in a number of HSE Health Centres, Primary Care Centres and GP clinics.",
        tags: ["Daily cleaning", "Deep cleans", "Custom schedule"],
        heroDescription:
          "Hygienic, high-standard cleaning for hospitals, HSE health centres, primary care centres and GP clinics.",
        overviewTitle: "Cleaning to Healthcare Standards",
        overview: paragraphs(
          "We at Cleaning Partners understand the importance of the high standard of cleaning required within hospitals and health centres. We currently clean in a number of HSE Health Centres, Primary Care Centres and GP clinics.",
          "We work closely with clients to customise a cleaning schedule to suit their business. Cleaning takes place on a daily basis, but we also provide a deep clean service on request of the customer."
        ),
        included: [
          "Daily cleaning of clinical and public areas",
          "Deep cleans on request",
          "Cleaning schedule customised to your facility",
          "Bathrooms, staff rooms and waiting areas",
          "Disinfecting of high-touch surfaces",
          "ULV fogging available",
        ],
        places: [
          "Hospitals",
          "HSE Health Centres",
          "Primary Care Centres",
          "GP Clinics",
        ],
      },
    },
    {
      slug: "board-of-education",
      seo: {},
      content: {
        title: "Board of Education",
        icon: media("/images/services/icon-education.svg"),
        cover: media("/images/home/vacuuming.png"),
        summary:
          "We clean a number of schools, colleges and adult learning facilities, weekly and with deep cleans on request, working around weekends, school holidays and closures.",
        tags: ["Classrooms", "Gym halls", "Window cleaning", "ULV fogging"],
        heroDescription:
          "Weekly and deep cleaning for schools, colleges and adult learning facilities.",
        overviewTitle: "Clean, Safe Places to Learn",
        overview: paragraphs(
          "We clean a number of schools, colleges and adult learning facilities, weekly and with deep cleans on request.",
          "We work around weekends, school holidays and closures so cleaning never gets in the way of teaching."
        ),
        included: [
          "Classrooms and corridors",
          "Gym halls",
          "Window cleaning",
          "Deep cleans during holidays and closures",
          "Bathrooms and staff rooms",
          "ULV fogging available",
        ],
        places: ["Schools", "Colleges", "Adult Learning Facilities"],
      },
    },
    {
      slug: "commercial-cleaning",
      seo: {},
      content: {
        title: "Commercial Cleaning",
        icon: media("/images/services/icon-commercial.svg"),
        cover: media("/images/home/vacuuming.png"),
        summary:
          "We clean many commercial buildings including offices, hairdressers and showrooms, with a cleaning schedule customised to meet your company's needs.",
        tags: ["Office space", "Staff rooms", "Floor buffing", "Disinfecting"],
        heroDescription:
          "Offices, hairdressers and showrooms kept spotless on a schedule built around your business.",
        overviewTitle: "Workplaces Kept Spotless",
        overview: paragraphs(
          "We clean many commercial buildings including offices, hairdressers and showrooms.",
          "We work closely with you to customise a cleaning schedule that meets your company's needs, with deep cleans available on request."
        ),
        included: [
          "Office space",
          "Staff rooms and kitchens",
          "Floor buffing",
          "Disinfecting of high-touch surfaces",
          "Bathrooms",
          "Deep cleans on request",
        ],
        places: ["Offices", "Hairdressers", "Showrooms"],
      },
    },
    {
      slug: "retail-cleaning",
      seo: {},
      content: {
        title: "Retail Cleaning",
        icon: media("/images/services/icon-retail.svg"),
        cover: media("/images/home/blog-curtains.png"),
        summary:
          "Shops, showrooms and salons kept customer-ready, with a cleaning schedule customised to meet your business needs.",
        tags: ["Showrooms", "Bathrooms", "Hoovering", "Disinfecting"],
        heroDescription:
          "Shops, showrooms and salons kept customer-ready, every day.",
        overviewTitle: "Customer-Ready, Every Day",
        overview: paragraphs(
          "Shops, showrooms and salons kept customer-ready, with a cleaning schedule customised to meet your business needs."
        ),
        included: [
          "Shop floors and showrooms",
          "Bathrooms",
          "Hoovering",
          "Disinfecting of high-touch surfaces",
          "Staff areas",
          "Deep cleans on request",
        ],
        places: ["Shops", "Showrooms", "Salons"],
      },
    },
    {
      slug: "ulv-fogging",
      seo: {},
      content: {
        title: "ULV Fogging",
        icon: media("/images/services/icon-fogging.svg"),
        cover: media("/images/home/hero.png"),
        summary:
          "Disinfects large and often hard-to-reach areas in a very short time, using an Ultra Low Volume mist that can kill viruses, fungi and bacteria.",
        tags: ["Large areas", "Fast turnaround", "Viruses & bacteria"],
        heroDescription:
          "Fast disinfection of large and hard-to-reach areas with an Ultra Low Volume mist.",
        overviewTitle: "Disinfection at Scale",
        overview: paragraphs(
          "ULV fogging disinfects large and often hard-to-reach areas in a very short time, using an Ultra Low Volume mist that can kill viruses, fungi and bacteria."
        ),
        included: [
          "Large areas covered quickly",
          "Hard-to-reach spaces",
          "Kills viruses, fungi and bacteria",
          "Fast turnaround",
        ],
        places: ["Healthcare", "Schools", "Offices", "Retail"],
      },
    },
  ]
}
