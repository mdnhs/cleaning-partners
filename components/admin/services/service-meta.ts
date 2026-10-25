import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/**
 * Editor hints for a service in CP's shape (R4-4): the card on /services
 * and the service's own page. The address (slug) and SEO live beside the
 * form, not in the draft.
 */
export const serviceEditorMeta: EditorMeta = {
  fields: {
    title: { label: "Name" },
    icon: { label: "Card icon", aspect: "square" },
    cover: { label: "Card and banner image" },
    summary: {
      label: "Card text",
      widget: "textarea",
      help: "Shown on the service card.",
    },
    tags: {
      label: "Card tags",
      itemName: "Tag",
      help: "Short labels under the card text, e.g. Daily or Deep clean.",
    },
    heroDescription: {
      label: "Banner text",
      widget: "textarea",
      help: "The sentence under the title in the page banner.",
    },
    overviewTitle: { label: "Heading" },
    overview: {
      label: "Overview",
      help: "Plain paragraphs. Lead and checklist styling are not used here.",
    },
    included: {
      label: "What's included",
      itemName: "Item",
      help: "At least one. Shown as a checklist.",
    },
    places: {
      label: "Places we clean",
      itemName: "Place",
    },
  },
  groups: {
    "": [
      {
        title: "Service card",
        description: "How the service appears in the list on /services.",
        fields: ["title", "icon", "summary", "tags"],
      },
      {
        title: "Page banner",
        description: "The image and text at the top of the service's page.",
        fields: ["cover", "heroDescription"],
      },
      {
        title: "Page content",
        description: "The text of the service's own page.",
        fields: ["overviewTitle", "overview", "included", "places"],
      },
    ],
  },
}
