import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/** Editor labels for the Contact page (template "contact"). The info cards and map are in Settings › Shared sections. */
export const contactEditorMeta: EditorMeta = {
  fields: {
    hero: {
      label: "Page hero",
      help: "Banner at the top of the page. It uses the site's default banner image (Settings › Site).",
    },
    "hero.crumb": { label: "Breadcrumb label" },
    "hero.title": { label: "Title" },
    "hero.description": { label: "Introduction" },
    contactTitle: {
      label: "Contact section title",
      help: "Replaces the shared contact section's title on this page.",
    },
    quoteForm: {
      label: "Quote form",
      help: "Copy beside and inside the form.",
    },
    "quoteForm.eyebrow": { label: "Eyebrow" },
    "quoteForm.title": { label: "Heading" },
    "quoteForm.intro": { label: "Introduction", rows: 3 },
    "quoteForm.stepsHeading": { label: "Steps heading" },
    "quoteForm.steps": {
      label: "Steps",
      itemName: "Step",
      itemLabel: "title",
    },
    "quoteForm.urgentTitle": { label: "Urgent box title" },
    "quoteForm.formTitle": { label: "Form heading" },
    "quoteForm.fields": { label: "Fields" },
    "quoteForm.fields.name": { label: "Name" },
    "quoteForm.fields.phone": { label: "Phone" },
    "quoteForm.fields.email": { label: "Email" },
    "quoteForm.fields.service": {
      label: "Service",
      help: "The options are the services, then the extra options.",
    },
    "quoteForm.fields.service.extraOptions": {
      label: "Extra options",
      itemName: "Option",
    },
    "quoteForm.fields.service.fallback": {
      label: "Wording when none is picked",
      help: "Used in the staff notification email only, not on the page.",
    },
    "quoteForm.fields.address": { label: "Address" },
    "quoteForm.fields.message": { label: "Message" },
    "quoteForm.fields.consent": { label: "Consent" },
    "quoteForm.fields.name.error": {
      label: "Name error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.phone.error": {
      label: "Phone error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.email.error": {
      label: "Email error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.service.error": {
      label: "Service error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.address.error": {
      label: "Address error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.message.error": {
      label: "Message error",
      help: "Shown under the field when it is rejected.",
    },
    "quoteForm.fields.consent.label": { label: "Consent wording" },
    "quoteForm.fields.consent.error": { label: "Consent error" },
    "quoteForm.chevron": { label: "Select arrow icon", aspect: "square" },
    "quoteForm.submitLabel": { label: "Button" },
    "quoteForm.mailSubject": {
      label: "Notification email subject",
      help: "Used in the staff notification email only, not on the page. {name} is the visitor's name.",
    },
    "quoteForm.sentMessage": {
      label: "Message after sending",
      help: "{email} is the contact email (Settings › Contact).",
      rows: 2,
      widget: "textarea",
    },
    "quoteForm.sendingLabel": {
      label: "Button while sending",
    },
    "quoteForm.errorMessage": {
      label: "Message when sending fails",
      rows: 2,
      widget: "textarea",
    },
    "quoteForm.rateLimitedMessage": {
      label: "Message when too many attempts",
      rows: 2,
      widget: "textarea",
    },
  },
  groups: {
    hero: [
      {
        title: "Text",
        description: "The breadcrumb, title and introduction over the banner.",
        fields: ["crumb", "title", "description"],
      },
    ],
  },
}
