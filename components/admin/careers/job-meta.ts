import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/**
 * Editor hints for a job posting (careers): what the job row on /careers
 * and the job's own page show. The address (slug) lives beside the form.
 */
export const jobEditorMeta: EditorMeta = {
  fields: {
    title: { label: "Job title" },
    reference: {
      label: "Job reference",
      help: "e.g. CP-2611-HC. Shown in the job summary and on applications.",
    },
    category: {
      label: "Category",
      help: "e.g. Healthcare, Commercial, Domestic. The careers page builds its filter buttons from these.",
    },
    location: { label: "Location", help: "e.g. Portlaoise, Co. Laois." },
    employmentType: {
      label: "Job type",
      help: "As candidates read it, e.g. Part-time, Permanent.",
    },
    schemaEmploymentType: {
      label: "Job type for search engines",
      help: "Google for Jobs reads this.",
      widget: "select",
      options: [
        { value: "FULL_TIME", label: "Full-time" },
        { value: "PART_TIME", label: "Part-time" },
        { value: "TEMPORARY", label: "Temporary" },
        { value: "CONTRACTOR", label: "Contract" },
      ],
    },
    hoursShort: {
      label: "Hours (short)",
      help: "In the page banner, e.g. 25 hrs/week, Mon–Fri.",
    },
    hours: {
      label: "Hours (full)",
      help: "In the job list and summary, e.g. 25 hrs/week, Mon–Fri 6am–11am.",
    },
    pay: {
      label: "Pay (short)",
      help: "e.g. €14.50–€15.50/hr. A range like this is also given to search engines.",
    },
    payDetail: {
      label: "Pay (full)",
      help: "In the job summary, e.g. €14.50–€15.50 per hour.",
    },
    startDate: { label: "Start date", help: "e.g. Immediate start." },
    closingDate: {
      label: "Closing date",
      help: "Last day to apply (Irish time). After it the job moves to Previous Openings. Leave empty to keep it open until you close it.",
    },
    summary: {
      label: "Summary",
      widget: "textarea",
      rows: 2,
      help: "The sentence under the title in the banner.",
    },
    about: { label: "About the role" },
    responsibilities: {
      label: "Key responsibilities",
      itemName: "Responsibility",
    },
    essential: {
      label: "Essential (required)",
      itemName: "Requirement",
      help: "At least one.",
    },
    desirable: { label: "Desirable (nice to have)", itemName: "Requirement" },
    offerIntro: {
      label: "Pay line",
      widget: "textarea",
      rows: 2,
      help: "Above the offer tiles.",
    },
    offers: { label: "What we offer", itemName: "Offer", itemLabel: "text" },
    "offers[].icon": {
      label: "Icon",
      widget: "select",
      options: [
        { value: "pay", label: "Pay" },
        { value: "training", label: "Training" },
        { value: "uniform", label: "Uniform & equipment" },
        { value: "roster", label: "Roster" },
        { value: "leave", label: "Leave" },
        { value: "career", label: "Career path" },
      ],
    },
    "offers[].text": { label: "Text" },
  },
  groups: {
    "": [
      {
        title: "The job",
        description: "Shown in the job list and the page banner.",
        fields: ["title", "reference", "category", "location", "summary"],
      },
      {
        title: "Hours & pay",
        fields: [
          "employmentType",
          "schemaEmploymentType",
          "hoursShort",
          "hours",
          "pay",
          "payDetail",
        ],
      },
      { title: "Dates", fields: ["startDate", "closingDate"] },
      {
        title: "Description",
        description: "The text of the job's own page.",
        fields: ["about", "responsibilities", "essential", "desirable"],
      },
      { title: "What we offer", fields: ["offerIntro", "offers"] },
    ],
  },
}
