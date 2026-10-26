import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/**
 * Editor hints for an article in CP's shape (R5-2): the card on /blog and
 * the article's own page. The address, category and byline live beside the
 * form (settings panel), not in the draft.
 */
export const articleEditorMeta: EditorMeta = {
  fields: {
    title: { label: "Title" },
    excerpt: {
      label: "Excerpt",
      widget: "textarea",
      help: "Shown on blog cards. Also the intro when there is no lead.",
    },
    cover: { label: "Cover image" },
    lead: {
      label: "Lead",
      widget: "textarea",
      help: "The large intro under the title. Leave empty to use the excerpt.",
    },
    tags: {
      label: "Tags",
      itemName: "Tag",
      help: "Leave empty to show the category as the only tag.",
    },
    body: {
      label: "Article text",
      help: "Leave empty to show the excerpt instead. Use the Lead paragraph button for the large opening paragraph (top level only) and Checklist for a tick list.",
    },
  },
}
