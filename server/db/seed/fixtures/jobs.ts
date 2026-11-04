import "server-only"

import type { JobContent } from "@/lib/schemas/content/job"

import { paragraphs } from "./rich-text"

export type JobFixture = {
  slug: string
  content: JobContent
  /** Set = closed by hand (Previous Openings). */
  closedAt: Date | null
}

const STANDARD_OFFERS: JobContent["offers"] = [
  { icon: "pay", text: "Weekly pay by bank transfer" },
  { icon: "training", text: "Paid training & certification" },
  { icon: "uniform", text: "Uniform and PPE provided" },
  { icon: "roster", text: "Set Mon–Fri roster, no weekends" },
  { icon: "leave", text: "Paid annual leave & bank holidays" },
  { icon: "career", text: "Career path to Supervisor" },
]

const ESSENTIAL = [
  "Legal right to work in Ireland",
  "Good spoken English to follow safety instructions",
  "Willing to complete Garda vetting",
  "Reliable, punctual and able to work on your feet for a full shift",
]

type JobBasics = Pick<
  JobContent,
  | "title"
  | "reference"
  | "category"
  | "location"
  | "employmentType"
  | "schemaEmploymentType"
  | "hoursShort"
  | "hours"
  | "pay"
  | "payDetail"
  | "summary"
>

/** A job with CP's standard requirements and offer, around its own basics. */
function job(
  basics: JobBasics,
  extra: Partial<Omit<JobContent, "about">> & {
    about: string[]
    responsibilities: string[]
  }
): JobContent {
  return {
    ...basics,
    startDate: "Immediate start",
    closingDate: null,
    essential: ESSENTIAL,
    desirable: [
      "Previous cleaning experience",
      "Manual Handling certificate",
      "Full driving licence and own transport",
    ],
    offerIntro: `Competitive pay of ${basics.payDetail} depending on experience, plus:`,
    offers: STANDARD_OFFERS,
    ...extra,
    about: paragraphs(...extra.about),
  }
}

/**
 * Starter jobs: the five open and three closed roles of Figma node 496:16;
 * the healthcare job is node 497:285 word for word. Closing dates are left
 * empty so the open roles stay open until closed in the admin.
 */
export function jobsFixture(): JobFixture[] {
  return [
    {
      slug: "cleaning-operative-healthcare",
      closedAt: null,
      content: job(
        {
          title: "Cleaning Operative – Healthcare",
          reference: "CP-2611-HC",
          category: "Healthcare",
          location: "Portlaoise, Co. Laois",
          employmentType: "Part-time, Permanent",
          schemaEmploymentType: "PART_TIME",
          hoursShort: "25 hrs/week, Mon–Fri",
          hours: "25 hrs/week, Mon–Fri 6am–11am",
          pay: "€14.50–€15.50/hr",
          payDetail: "€14.50–€15.50 per hour",
          summary:
            "Part-time, permanent role at a busy primary care centre in Portlaoise.",
        },
        {
          about: [
            "We’re looking for a reliable, detail-focused Cleaning Operative to join our healthcare team at a busy primary care centre in Portlaoise. You’ll help keep clinical and public areas safe, hygienic and welcoming for patients and staff, following HSE infection prevention and control standards.",
            "No healthcare experience? No problem — we provide full paid training, including Infection Prevention & Control, Manual Handling and chemical safety, before your first shift. Hours are Monday to Friday, 6am to 11am, with no weekends.",
          ],
          responsibilities: [
            "Clean and disinfect consultation rooms, waiting areas, toilets and staff areas to a set schedule",
            "Follow colour-coding and infection prevention & control (IPC) procedures at all times",
            "Use floor scrubber-dryers, buffers and vacuum equipment safely",
            "Handle and dispose of general and healthcare waste correctly",
            "Restock hygiene supplies and report maintenance or safety issues to your supervisor",
            "Complete cleaning logs and sign-off sheets accurately",
          ],
          desirable: [
            "Previous cleaning experience, ideally in healthcare",
            "Manual Handling or HSELanD hand hygiene certificate",
            "Full driving licence and own transport",
          ],
          offerIntro:
            "Competitive pay of €14.50–€15.50 per hour depending on experience, plus:",
        }
      ),
    },
    {
      slug: "commercial-cleaner-evenings",
      closedAt: null,
      content: job(
        {
          title: "Commercial Cleaner – Evenings",
          reference: "CP-2611-CE",
          category: "Commercial",
          location: "Tullamore, Co. Offaly",
          employmentType: "Part-time, Permanent",
          schemaEmploymentType: "PART_TIME",
          hoursShort: "20 hrs/week, Mon–Fri",
          hours: "20 hrs/week, Mon–Fri 6pm–10pm",
          pay: "€14.50/hr",
          payDetail: "€14.50 per hour",
          summary:
            "Evening cleaning of offices and shared spaces for a business park in Tullamore.",
        },
        {
          about: [
            "Join our commercial team cleaning modern offices in Tullamore after the working day ends. You’ll work with a small, friendly crew to leave every desk, kitchen and washroom ready for the morning.",
          ],
          responsibilities: [
            "Clean offices, kitchens, meeting rooms and washrooms to a checklist",
            "Empty bins and handle recycling correctly",
            "Vacuum and mop floors using our equipment",
            "Report anything that needs repair to your supervisor",
          ],
        }
      ),
    },
    {
      slug: "cleaning-supervisor",
      closedAt: null,
      content: job(
        {
          title: "Cleaning Supervisor",
          reference: "CP-2611-SU",
          category: "Supervisory",
          location: "Athlone, Co. Westmeath",
          employmentType: "Full-time, Permanent",
          schemaEmploymentType: "FULL_TIME",
          hoursShort: "39 hrs/week, Mon–Fri",
          hours: "39 hrs/week, Mon–Fri",
          pay: "€33,000–€36,000/yr",
          payDetail: "€33,000–€36,000 per year",
          summary:
            "Lead a team of cleaners across our Athlone sites and keep standards high.",
        },
        {
          about: [
            "We’re looking for an organised Cleaning Supervisor to look after our teams across several sites in Athlone. You’ll plan rosters, train new starters, check quality and be the first point of contact for our clients.",
          ],
          responsibilities: [
            "Supervise and support cleaning teams across several sites",
            "Plan rosters and cover for holidays and absences",
            "Run site inspections and quality audits",
            "Train new team members on procedures and safety",
            "Keep in regular contact with clients",
          ],
          desirable: [
            "Previous supervisory experience in cleaning or facilities",
            "Full driving licence and own transport",
          ],
        }
      ),
    },
    {
      slug: "domestic-cleaner",
      closedAt: null,
      content: job(
        {
          title: "Domestic Cleaner",
          reference: "CP-2611-DO",
          category: "Domestic",
          location: "Mountmellick & surrounds",
          employmentType: "Part-time",
          schemaEmploymentType: "PART_TIME",
          hoursShort: "Flexible daytime hours",
          hours: "Flexible daytime hours",
          pay: "€15.00/hr + mileage",
          payDetail: "€15.00 per hour plus mileage",
          summary: "Clean homes around Mountmellick on flexible daytime hours.",
        },
        {
          about: [
            "Our domestic customers trust us with their homes. You’ll visit regular clients around Mountmellick, working to their own checklist, with hours that fit around school runs and family life.",
          ],
          responsibilities: [
            "Clean kitchens, bathrooms, bedrooms and living areas",
            "Follow each client’s own checklist",
            "Look after keys and alarm codes securely",
          ],
        }
      ),
    },
    {
      slug: "deep-clean-window-technician",
      closedAt: null,
      content: job(
        {
          title: "Deep Clean & Window Technician",
          reference: "CP-2611-DW",
          category: "Specialist",
          location: "Laois & Kildare",
          employmentType: "Full-time, Permanent",
          schemaEmploymentType: "FULL_TIME",
          hoursShort: "39 hrs/week, some weekends",
          hours: "39 hrs/week, some weekends",
          pay: "€15.50–€17.00/hr",
          payDetail: "€15.50–€17.00 per hour",
          summary:
            "Deep cleans, window and specialist cleaning across Laois and Kildare.",
        },
        {
          about: [
            "Join our specialist crew carrying out deep cleans, window cleaning and periodic work for commercial clients across Laois and Kildare. You’ll be trained on our machines and work at a variety of sites.",
          ],
          responsibilities: [
            "Carry out deep cleans of kitchens, washrooms and floors",
            "Clean windows using water-fed poles",
            "Operate scrubber-dryers and carpet machines",
            "Load and look after the van and equipment",
          ],
        }
      ),
    },
    {
      slug: "school-cleaning-operative",
      closedAt: new Date("2026-09-12T12:00:00Z"),
      content: job(
        {
          title: "School Cleaning Operative",
          reference: "CP-2608-SC",
          category: "Commercial",
          location: "Portarlington, Co. Laois",
          employmentType: "Part-time",
          schemaEmploymentType: "PART_TIME",
          hoursShort: "15 hrs/week, Mon–Fri",
          hours: "15 hrs/week, Mon–Fri 4pm–7pm",
          pay: "€14.50/hr",
          payDetail: "€14.50 per hour",
          summary: "After-school cleaning at a school in Portarlington.",
        },
        {
          about: [
            "After-school cleaning of classrooms, corridors and washrooms in Portarlington.",
          ],
          responsibilities: ["Clean classrooms, corridors and washrooms"],
        }
      ),
    },
    {
      slug: "floor-care-technician",
      closedAt: new Date("2026-08-28T12:00:00Z"),
      content: job(
        {
          title: "Floor Care Technician",
          reference: "CP-2607-FC",
          category: "Specialist",
          location: "Naas, Co. Kildare",
          employmentType: "Full-time",
          schemaEmploymentType: "FULL_TIME",
          hoursShort: "39 hrs/week",
          hours: "39 hrs/week",
          pay: "€15.50/hr",
          payDetail: "€15.50 per hour",
          summary: "Floor stripping, sealing and polishing around Naas.",
        },
        {
          about: [
            "Floor stripping, sealing and polishing for commercial clients around Naas.",
          ],
          responsibilities: ["Strip, seal and polish hard floors"],
        }
      ),
    },
    {
      slug: "office-cleaner-mornings",
      closedAt: new Date("2026-07-30T12:00:00Z"),
      content: job(
        {
          title: "Office Cleaner – Mornings",
          reference: "CP-2606-OM",
          category: "Commercial",
          location: "Portlaoise, Co. Laois",
          employmentType: "Part-time",
          schemaEmploymentType: "PART_TIME",
          hoursShort: "15 hrs/week, Mon–Fri",
          hours: "15 hrs/week, Mon–Fri 6am–9am",
          pay: "€14.25/hr",
          payDetail: "€14.25 per hour",
          summary: "Early-morning office cleaning in Portlaoise.",
        },
        {
          about: ["Early-morning cleaning of offices in Portlaoise."],
          responsibilities: ["Clean offices, kitchens and washrooms"],
        }
      ),
    },
  ]
}
