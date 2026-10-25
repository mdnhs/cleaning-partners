import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"

import { PAGE_HERO_GROUPS } from "../shared/editor-groups"

/** Editor labels for the Blog page (template "blog") and the copy around an article. Articles are edited under Blog. */
export const blogEditorMeta: EditorMeta = {
  fields: {
    hero: { label: "Page hero", help: "Banner at the top of the page." },
    "hero.image": { label: "Banner image" },
    "hero.crumb": { label: "Breadcrumb label" },
    "hero.title": { label: "Title" },
    "hero.description": { label: "Introduction" },
    featuredArticle: {
      label: "Featured article",
      widget: "collection",
      collection: "articles",
      help: "Shown large above the list. None = the newest article.",
    },
    pageSize: { label: "Articles per page" },
    allLabel: { label: "“All” filter label" },
    filterAria: { label: "Filter: screen reader label" },
    featuredLabel: { label: "Featured badge" },
    emptyState: {
      label: "No results message",
      rows: 2,
      widget: "textarea",
    },
    paginationAria: { label: "Pagination: screen reader label" },
    prevAria: { label: "Previous: screen reader label" },
    prevLabel: { label: "Previous button" },
    nextAria: { label: "Next: screen reader label" },
    nextLabel: { label: "Next button" },
    article: { label: "Article page", help: "Labels shared by every article." },
    "article.breadcrumbBlogHref": { label: "Breadcrumb link" },
    "article.breadcrumbBlog": { label: "Breadcrumb label" },
    "article.authorName": { label: "Author name" },
    "article.readTime": {
      label: "Read-time label",
      help: "{n} is the number of minutes (the article's read time).",
    },
    "article.tagsLabel": { label: "Tags label" },
    "article.writtenBy": { label: "Written-by line" },
    "article.authorBio": {
      label: "Author bio",
      rows: 3,
      widget: "textarea",
    },
    "article.searchAction": { label: "Search address" },
    "article.categoriesHeading": { label: "Categories heading" },
    "article.recentHeading": { label: "Recent posts heading" },
    "article.related": { label: "Related articles" },
    "article.share": { label: "Share buttons" },
    "article.share.aria": {
      label: "Share: screen reader label",
      help: "{network} is the network name.",
    },
    "article.share.networks": {
      label: "Networks",
      itemName: "Network",
      itemLabel: "name",
    },
    "article.share.networks[].url": {
      label: "Share address",
      help: "{url} is the encoded address of the article.",
    },
  },
  groups: { hero: PAGE_HERO_GROUPS },
}
