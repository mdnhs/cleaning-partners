import type { HelpArticle } from "../types"

export const FAQ_DOCS: readonly HelpArticle[] = [
  {
    slug: "troubleshooting",
    title: "Quick answers when something looks wrong",
    group: "faq",
    description:
      "My change is not on the site, I cannot find a page, an upload fails.",
    lead: "Most problems have a short fix. Start with the one that matches.",
    keywords: [
      "problem",
      "not showing",
      "missing",
      "error",
      "cache",
      "not live",
    ],
    sections: [
      {
        title: "My change is not on the site",
        blocks: [
          {
            type: "list",
            items: [
              "Did you press **Publish**? A saved draft is not live. The label near the top says **Saved**; a published page shows **Published**.",
              "Lists (logos, testimonials, team, group companies) and a service's on/off switch are live when you save them, with no Publish step.",
              "Give it a few seconds and refresh the page. If your browser still shows the old version, hold `Shift` while you refresh.",
            ],
          },
        ],
      },
      {
        title: "I cannot find a page or setting",
        blocks: [
          {
            type: "p",
            text: "Press `⌘K` (or `Ctrl K`) and type a word from its name. The search only shows what your role can open; if something is missing, ask an owner to check your role.",
          },
        ],
      },
      {
        title: "A screen says someone else changed it",
        blocks: [
          {
            type: "p",
            text: "Two people edited the same thing. Choose to load their version, or keep yours and overwrite. Looking at **History** first shows what each of you changed.",
          },
        ],
      },
      {
        title: "A picture will not upload",
        blocks: [
          {
            type: "p",
            text: "Pictures must be JPG, PNG or WebP and not too large. Try a smaller file. If it still fails, the message on the screen says why.",
          },
        ],
      },
      {
        title: "I am locked out or lost my two-factor device",
        blocks: [
          {
            type: "list",
            items: [
              "Ask another owner (they are listed on the [Help home](/admin/help)). They can reset your access from Users & roles.",
              "If the only owner cannot sign in, whoever hosts the site can restore access with the owner recovery script for that email address.",
            ],
          },
        ],
      },
      {
        title: "Still stuck?",
        blocks: [
          {
            type: "p",
            text: "Ask one of the owners listed at the bottom of the [Help home](/admin/help).",
          },
        ],
      },
    ],
  },
]
