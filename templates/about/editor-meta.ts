import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/** Editor labels for the About page (template "about"). Clients, why-choose-us and the rest are in Settings › Shared sections. */
export const aboutEditorMeta: EditorMeta = {
  fields: {
    hero: {
      label: "Page hero",
      help: "Banner at the top of the page. It uses the site's default banner image (Settings › Site).",
    },
    "hero.crumb": { label: "Breadcrumb label" },
    "hero.title": { label: "Title" },
    "hero.description": { label: "Introduction" },
    story: { label: "Our story", help: "Photos, copy and sectors." },
    "story.imageA": { label: "First photo" },
    "story.imageAAlt": { label: "First photo description" },
    "story.imageB": { label: "Second photo" },
    "story.imageBAlt": { label: "Second photo description" },
    "story.eyebrow": { label: "Eyebrow" },
    "story.title": { label: "Heading" },
    "story.paragraphs": { label: "Text", help: "One paragraph per block." },
    "story.sectorsHeading": { label: "Sectors heading" },
    "story.sectors": { label: "Sectors", itemName: "Sector" },
    "story.cta": { label: "Button" },
    stats: {
      label: "Stats",
      itemName: "Stat",
      itemLabel: "label",
      help: "The figures in the band under the story.",
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
