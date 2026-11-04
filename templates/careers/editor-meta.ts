import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/**
 * Editor hints for page "careers": the words of /careers, of every job page
 * (shared labels and sidebar) and of the application form.
 */
export const careersEditorMeta: EditorMeta = {
  fields: {
    hero: {
      label: "Banner",
      help: "The title and intro at the top of /careers.",
    },
    why: {
      label: "Why work with us",
      help: "The four cards under the banner.",
    },
    "why.cards": { label: "Cards", itemName: "Card", itemLabel: "title" },
    "why.cards[].icon": { label: "Icon", aspect: "square" },
    open: {
      label: "Open positions",
      help: "The search, filters and job rows. {count} is the number of open roles; {ago} how long ago a job was posted.",
    },
    previous: {
      label: "Previous openings",
      help: "Closed roles. {date} is the closing date.",
    },
    process: { label: "Hiring process" },
    "process.steps": { label: "Steps", itemName: "Step", itemLabel: "title" },
    talentPool: {
      label: "Talent pool banner",
      help: "The navy banner at the end of /careers.",
    },
    job: {
      label: "Job pages",
      help: "Labels and sidebar boxes shared by every job page. The job's own text is edited under Careers › Jobs.",
    },
    "job.beforeItems": {
      label: "Before you apply checklist",
      itemName: "Item",
    },
    apply: {
      label: "Application form",
      help: "Every word of the form. {title}, {location} and {reference} are the job's.",
    },
    "apply.crumb": {
      label: "Breadcrumb",
      help: "Last crumb on a job's application form, after the job title.",
    },
    "apply.options.rightToWork": {
      label: "Permission to work options",
      itemName: "Option",
    },
    "apply.options.hours": {
      label: "Hours per week options",
      itemName: "Option",
    },
    "apply.options.years": {
      label: "Cleaning experience options",
      itemName: "Option",
    },
    "apply.options.healthcare": {
      label: "Healthcare experience options",
      itemName: "Option",
    },
    "apply.options.shifts": { label: "Shift options", itemName: "Option" },
    "apply.options.certificates": {
      label: "Certificate options",
      itemName: "Option",
    },
    "apply.options.heardAbout": {
      label: "How did you hear options",
      itemName: "Option",
    },
    "apply.sidebar.nextSteps": {
      label: "What happens next",
      itemName: "Step",
      itemLabel: "title",
    },
  },
}
