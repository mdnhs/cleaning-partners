import type { HelpArticle } from "../types"

export const GROWTH_DOCS: readonly HelpArticle[] = [
  {
    slug: "seo",
    title: "SEO: how the site appears in search",
    group: "growth",
    description: "Titles and descriptions, redirects and canonical addresses.",
    lead: "SEO controls what Google shows for each page and keeps old links working.",
    permission: { seo: ["read"] },
    keywords: [
      "seo",
      "search",
      "title",
      "description",
      "redirect",
      "canonical",
      "sitemap",
    ],
    sections: [
      {
        title: "A page's own SEO",
        blocks: [
          {
            type: "p",
            text: "Every page, service, article and job has an **SEO** tab next to its content: the search title, description and the picture shown when it is shared. A preview shows how it looks in a search result.",
          },
        ],
      },
      {
        title: "Overview and Defaults",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "**Overview** lists pages that are missing a title or description. **Defaults** holds the site-wide values used when a page has none, and whether the site is visible to search engines.",
          },
          { type: "open", href: "/admin/seo", label: "Open SEO" },
        ],
      },
      {
        title: "Redirects",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "A redirect sends visitors from an old address to a new one. Changing the address of a page adds one for you; add your own under **Redirects**.",
          },
          {
            type: "open",
            href: "/admin/seo/redirects",
            label: "Open Redirects",
          },
        ],
      },
      {
        title: "Canonical URLs",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "**Canonical URLs** shows the preferred address for each page and lets you set it, so the same page is not counted twice.",
          },
          {
            type: "open",
            href: "/admin/seo/canonical",
            label: "Open Canonical URLs",
          },
        ],
      },
    ],
  },
  {
    slug: "marketing",
    title: "Marketing: tracking and consent",
    group: "growth",
    description: "Analytics, the cookie banner, events and custom code.",
    lead: "Marketing connects your analytics tools and controls the cookie banner visitors see.",
    permission: { marketing: ["read"] },
    keywords: [
      "analytics",
      "tracking",
      "cookies",
      "consent",
      "pixel",
      "events",
      "gtm",
    ],
    sections: [
      {
        title: "Tracking",
        blocks: [
          {
            type: "p",
            text: "Add your analytics and advertising IDs under **Tracking**. They only load for visitors who accept the matching cookies.",
          },
          { type: "open", href: "/admin/marketing", label: "Open Tracking" },
        ],
      },
      {
        title: "Consent banner",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Edit the banner's words and categories under **Consent banner**. Changing the version asks everyone for consent again.",
          },
          {
            type: "open",
            href: "/admin/marketing/consent",
            label: "Open Consent banner",
          },
        ],
      },
      {
        title: "Event catalogue and custom code",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "**Event catalogue** lists what the site reports (a quote sent, a phone tap). **Custom code** adds your own snippets; it is for owners and runs only after consent.",
          },
        ],
      },
    ],
  },
]
