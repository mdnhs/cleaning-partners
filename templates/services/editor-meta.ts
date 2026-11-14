import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

import { PAGE_HERO_GROUPS } from "../shared/editor-groups"

/** Editor labels for the Services page (template "services") and the copy around a service. Service cards are edited under Services. */
export const servicesEditorMeta: EditorMeta = {
  fields: {
    hero: { label: "Page hero", help: "Banner at the top of the page." },
    "hero.image": {
      label: "Banner image",
      help: "Leave empty to use the default banner (Settings › Site).",
    },
    "hero.crumb": { label: "Breadcrumb label" },
    "hero.title": { label: "Title" },
    "hero.description": { label: "Introduction" },
    grid: {
      label: "Services grid",
      help: "The heading above the service cards.",
    },
    "grid.eyebrow": { label: "Eyebrow" },
    "grid.title": { label: "Heading" },
    "grid.intro": { label: "Introduction", rows: 3 },
    "grid.priceBadge": { label: "Price badge" },
    "grid.learnMoreAria": {
      label: "Learn more: screen reader label",
      help: "{title} is the service name.",
    },
    "grid.learnMore": { label: "Learn more link" },
    "grid.quoteCta": { label: "Quote button" },
    "grid.helpCard": {
      label: "“Not sure” card",
      help: "The last card in the grid.",
    },
    "grid.helpCard.icon": { label: "Icon", aspect: "square" },
    "grid.helpCard.title": {
      label: "Title",
      help: "Leave empty to use the shared quote card (Settings › Microcopy).",
    },
    "grid.helpCard.body": {
      label: "Text",
      help: "Leave empty to use the shared quote card (Settings › Microcopy).",
    },
    "grid.helpCard.cta": {
      label: "Button",
      help: "Leave empty to use the shared quote card (Settings › Microcopy).",
    },
    "grid.helpCard.phoneLabel": {
      label: "Call line",
      help: "{office} and {officeExtension} are filled from Settings › Contact. Leave empty to use the shared quote card (Settings › Microcopy).",
    },
    detail: {
      label: "Service page",
      help: "Labels shared by every service page.",
    },
    "detail.breadcrumbHref": { label: "Breadcrumb link" },
    "detail.breadcrumbLabel": { label: "Breadcrumb label" },
    "detail.overviewEyebrow": { label: "Overview eyebrow" },
    "detail.includedHeading": { label: "Included heading" },
    "detail.placesHeading": { label: "Places heading" },
    "detail.sidebarAria": { label: "Sidebar: screen reader label" },
    "detail.sidebarHeading": { label: "Sidebar heading" },
    "detail.officeHours": {
      label: "Office hours box",
      help: "{hours} is filled from Settings › Contact.",
    },
  },
  groups: { hero: PAGE_HERO_GROUPS },
}
