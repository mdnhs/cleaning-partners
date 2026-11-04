// Figma-derived job content shared by the careers tests.

const paragraphs = (...texts: string[]) => ({
  type: "doc" as const,
  content: texts.map((text) => ({
    type: "paragraph" as const,
    content: [{ type: "text" as const, text }],
  })),
})

/** Figma node 497:285, "Cleaning Operative – Healthcare". */
export const healthcareJob = {
  title: "Cleaning Operative – Healthcare",
  reference: "CP-2611-HC",
  category: "Healthcare",
  location: "Portlaoise, Co. Laois",
  employmentType: "Part-time, Permanent",
  schemaEmploymentType: "PART_TIME" as const,
  hoursShort: "25 hrs/week, Mon–Fri",
  hours: "25 hrs/week, Mon–Fri 6am–11am",
  pay: "€14.50–€15.50/hr",
  payDetail: "€14.50–€15.50 per hour",
  startDate: "Immediate start",
  closingDate: "2026-11-28",
  summary:
    "Part-time, permanent role at a busy primary care centre in Portlaoise.",
  about: paragraphs(
    "We’re looking for a reliable, detail-focused Cleaning Operative to join our healthcare team at a busy primary care centre in Portlaoise."
  ),
  responsibilities: [
    "Clean and disinfect consultation rooms, waiting areas, toilets and staff areas to a set schedule",
  ],
  essential: ["Legal right to work in Ireland"],
  desirable: ["Previous cleaning experience, ideally in healthcare"],
  offerIntro:
    "Competitive pay of €14.50–€15.50 per hour depending on experience, plus:",
  offers: [
    { icon: "pay" as const, text: "Weekly pay by bank transfer" },
    { icon: "training" as const, text: "Paid training & certification" },
  ],
}
