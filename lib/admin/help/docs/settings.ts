import type { HelpArticle } from "../types"

export const SETTINGS_DOCS: readonly HelpArticle[] = [
  {
    slug: "site-settings",
    title: "Site settings",
    group: "settings",
    description: "Business details, enquiries, careers and chat settings.",
    lead: "Site settings holds the details the whole site uses: who you are, how to reach you and where enquiries go.",
    permission: { settings: ["read"] },
    keywords: [
      "settings",
      "contact details",
      "phone",
      "email",
      "address",
      "logo",
      "identity",
    ],
    sections: [
      {
        title: "What is in it",
        blocks: [
          {
            type: "list",
            items: [
              "**Identity**: business name, logo, membership badge and social links.",
              "**Contact details**: phone numbers, email, address and opening hours. Pages that mention them update by themselves.",
              "**Enquiries**: who is emailed about new enquiries and what the form says.",
              "**Job applications** and **Live chat**: recipients, retention and chat options.",
              "**AI assistant** and **Integrations**: email sending, storage and other connections.",
            ],
          },
          {
            type: "open",
            href: "/admin/settings",
            label: "Open Site settings",
          },
        ],
      },
      {
        title: "Contact details appear everywhere",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Change a phone number once in **Contact details** and the top bar, the footer, the Contact page and buttons that call you all follow.",
          },
        ],
      },
    ],
  },
  {
    slug: "appearance",
    title: "Appearance",
    group: "settings",
    description: "Colours and look of the site and the admin.",
    lead: "Appearance sets the colours used across the public site.",
    permission: { appearance: ["read"] },
    keywords: ["theme", "colours", "colors", "brand", "look"],
    sections: [
      {
        title: "Changing colours",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Appearance**.",
              "Pick a colour and watch the preview.",
              "**Publish** to apply it to the live site.",
            ],
          },
          { type: "open", href: "/admin/appearance", label: "Open Appearance" },
        ],
      },
    ],
  },
  {
    slug: "ai-assistant",
    title: "The AI assistant",
    group: "settings",
    description: "Ask for help writing and improving text while you edit.",
    lead: "The assistant can suggest text for the field you are editing and answer questions about the admin.",
    permission: { ai: ["use"] },
    keywords: ["ai", "assistant", "write", "suggest", "chatgpt"],
    sections: [
      {
        title: "Using it",
        blocks: [
          {
            type: "steps",
            items: [
              "Press `⌘J` (or `Ctrl J`), or use the sparkle button at the top.",
              "Click a text field, then ask for a rewrite or a shorter version.",
              "Choose **Insert** to put the suggestion in the field. It saves like anything you type.",
            ],
          },
          {
            type: "callout",
            tone: "tip",
            text: "Read what it suggests before you publish. An owner can turn it on or off in **Site settings**, **AI assistant**.",
          },
        ],
      },
    ],
  },
]
