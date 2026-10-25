import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

/** Editor labels for the home page (template "home"). */
export const homeEditorMeta: EditorMeta = {
  fields: {
    hero: {
      label: "Hero",
      help: "The full-screen banner at the top of the home page.",
    },
    "hero.background": { label: "Background image" },
    "hero.title": { label: "Heading" },
    "hero.subtitle": {
      label: "Introduction",
      rows: 3,
      widget: "textarea",
    },
    "hero.primaryCta": { label: "Primary button" },
    "hero.secondaryCta": { label: "Secondary button" },
    "hero.memberLabel": { label: "Membership label" },
    "hero.memberLogo": { label: "Membership logo", aspect: "square" },
    "hero.memberLogoAlt": { label: "Membership logo description" },
    services: {
      label: "Services section",
      help: "The photos, heading and short list beside the service cards.",
    },
    "services.imageA": { label: "First photo" },
    "services.imageAAlt": { label: "First photo description" },
    "services.imageB": { label: "Second photo" },
    "services.imageBAlt": { label: "Second photo description" },
    "services.eyebrow": { label: "Eyebrow" },
    "services.title": { label: "Heading" },
    "services.description": { label: "Introduction", rows: 3 },
    "services.items": {
      label: "Highlights",
      itemName: "Highlight",
      itemLabel: "title",
    },
    "services.itemIcon": { label: "Tick icon", aspect: "square" },
    "services.moreText": { label: "Text under the list" },
    "services.cta": { label: "Button" },
    blog: {
      label: "Blog section",
      help: "The latest articles near the end of the page.",
    },
    "blog.count": {
      label: "Posts shown",
      help: "How many recent articles appear on the home page.",
    },
  },
  groups: {
    hero: [
      {
        title: "Text",
        description: "The words over the banner photo.",
        fields: ["title", "subtitle"],
      },
      { title: "Background", fields: ["background"] },
      {
        title: "Buttons",
        description: "The two calls to action under the text.",
        fields: ["primaryCta", "secondaryCta"],
      },
      {
        title: "Membership",
        description: "The “Proud member of” line.",
        fields: ["memberLabel", "memberLogo", "memberLogoAlt"],
      },
    ],
  },
}
