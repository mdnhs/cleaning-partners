export type Service = {
  slug: string
  title: string
  icon: string
  cover: string
  /** Short copy for the services grid card */
  summary: string
  /** Tags on the services grid card */
  tags: string[]
  heroDescription: string
  overviewTitle: string
  overview: string[]
  included: string[]
  places: string[]
}

// Medical copy comes from the Figma detail page; the others reuse the
// services grid copy until the client supplies their own.
export const services: Service[] = [
  {
    slug: "medical-cleaning",
    title: "Medical Cleaning",
    icon: "/images/services/icon-medical.svg",
    cover: "/images/home/cleaning-the-counter.png",
    summary:
      "We understand the importance of the high standard of cleaning required within hospitals and health centres. We currently clean in a number of HSE Health Centres, Primary Care Centres and GP clinics.",
    tags: ["Daily cleaning", "Deep cleans", "Custom schedule"],
    heroDescription:
      "Hygienic, high-standard cleaning for hospitals, HSE health centres, primary care centres and GP clinics.",
    overviewTitle: "Cleaning to Healthcare Standards",
    overview: [
      "We at Cleaning Partners understand the importance of the high standard of cleaning required within hospitals and health centres. We currently clean in a number of HSE Health Centres, Primary Care Centres and GP clinics.",
      "We work closely with clients to customise a cleaning schedule to suit their business. Cleaning takes place on a daily basis, but we also provide a deep clean service on request of the customer.",
    ],
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
  {
    slug: "board-of-education",
    title: "Board of Education",
    icon: "/images/services/icon-education.svg",
    cover: "/images/home/vacuuming.png",
    summary:
      "We clean a number of schools, colleges and adult learning facilities, weekly and with deep cleans on request, working around weekends, school holidays and closures.",
    tags: ["Classrooms", "Gym halls", "Window cleaning", "ULV fogging"],
    heroDescription:
      "Weekly and deep cleaning for schools, colleges and adult learning facilities.",
    overviewTitle: "Clean, Safe Places to Learn",
    overview: [
      "We clean a number of schools, colleges and adult learning facilities, weekly and with deep cleans on request.",
      "We work around weekends, school holidays and closures so cleaning never gets in the way of teaching.",
    ],
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
  {
    slug: "commercial-cleaning",
    title: "Commercial Cleaning",
    icon: "/images/services/icon-commercial.svg",
    cover: "/images/home/vacuuming.png",
    summary:
      "We clean many commercial buildings including offices, hairdressers and showrooms, with a cleaning schedule customised to meet your company's needs.",
    tags: ["Office space", "Staff rooms", "Floor buffing", "Disinfecting"],
    heroDescription:
      "Offices, hairdressers and showrooms kept spotless on a schedule built around your business.",
    overviewTitle: "Workplaces Kept Spotless",
    overview: [
      "We clean many commercial buildings including offices, hairdressers and showrooms.",
      "We work closely with you to customise a cleaning schedule that meets your company's needs, with deep cleans available on request.",
    ],
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
  {
    slug: "retail-cleaning",
    title: "Retail Cleaning",
    icon: "/images/services/icon-retail.svg",
    cover: "/images/home/blog-curtains.png",
    summary:
      "Shops, showrooms and salons kept customer-ready, with a cleaning schedule customised to meet your business needs.",
    tags: ["Showrooms", "Bathrooms", "Hoovering", "Disinfecting"],
    heroDescription:
      "Shops, showrooms and salons kept customer-ready, every day.",
    overviewTitle: "Customer-Ready, Every Day",
    overview: [
      "Shops, showrooms and salons kept customer-ready, with a cleaning schedule customised to meet your business needs.",
    ],
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
  {
    slug: "ulv-fogging",
    title: "ULV Fogging",
    icon: "/images/services/icon-fogging.svg",
    cover: "/images/home/hero.png",
    summary:
      "Disinfects large and often hard-to-reach areas in a very short time, using an Ultra Low Volume mist that can kill viruses, fungi and bacteria.",
    tags: ["Large areas", "Fast turnaround", "Viruses & bacteria"],
    heroDescription:
      "Fast disinfection of large and hard-to-reach areas with an Ultra Low Volume mist.",
    overviewTitle: "Disinfection at Scale",
    overview: [
      "ULV fogging disinfects large and often hard-to-reach areas in a very short time, using an Ultra Low Volume mist that can kill viruses, fungi and bacteria.",
    ],
    included: [
      "Large areas covered quickly",
      "Hard-to-reach spaces",
      "Kills viruses, fungi and bacteria",
      "Fast turnaround",
    ],
    places: ["Healthcare", "Schools", "Offices", "Retail"],
  },
]

export function getService(slug: string) {
  return services.find((service) => service.slug === slug)
}
