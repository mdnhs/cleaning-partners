import type { HelpArticle } from "../types"

export const INBOX_DOCS: readonly HelpArticle[] = [
  {
    slug: "enquiries",
    title: "Enquiries",
    group: "inbox",
    description: "Answer quote requests and contact messages.",
    lead: "Every quote request and contact message from the site lands in Enquiries, and by email to the addresses in Site settings.",
    permission: { lead: ["read"] },
    keywords: ["enquiry", "lead", "quote", "contact form", "status", "export"],
    sections: [
      {
        title: "Working through them",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Enquiries**. New ones are marked **New**.",
              "Open an enquiry to read it, then reply by email or phone.",
              "Set its status as you go: **Contacted**, **Qualified**, **Won** or **Lost**.",
              "Add notes for the team.",
            ],
          },
          { type: "open", href: "/admin/leads", label: "Open Enquiries" },
        ],
      },
      {
        title: "Export",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "**Export** downloads the list as a spreadsheet, for people with the right access.",
          },
        ],
      },
      {
        title: "Who is emailed",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "The email addresses that receive new enquiries are set in **Site settings**, **Enquiries**.",
          },
        ],
      },
    ],
  },
  {
    slug: "job-applications",
    title: "Job applications",
    group: "inbox",
    description: "Read applications, download CVs and track each applicant.",
    lead: "Applications from the careers form arrive here, and by email to the Careers recipients in Site settings.",
    permission: { lead: ["read"] },
    keywords: ["application", "cv", "applicant", "careers", "shortlist"],
    sections: [
      {
        title: "Reviewing",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Job applications**.",
              "Open one to read the answers and download the CV.",
              "Set its status (for example **Reviewing**, **Shortlisted**) and add notes.",
            ],
          },
          {
            type: "open",
            href: "/admin/careers/applications",
            label: "Open Job applications",
          },
        ],
      },
      {
        title: "Privacy",
        level: 3,
        blocks: [
          {
            type: "callout",
            tone: "note",
            text: "Applications and their CVs are deleted automatically after the retention period set in **Site settings**, **Job applications**.",
          },
        ],
      },
    ],
  },
  {
    slug: "live-chat",
    title: "Live chat",
    group: "inbox",
    description: "Reply to visitors who message you from the website.",
    lead: "The chat bubble on the site starts conversations that you answer here.",
    permission: { chat: ["read"] },
    keywords: ["chat", "messages", "visitor", "reply"],
    sections: [
      {
        title: "Replying",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Live chat**. A badge on the menu shows new conversations.",
              "Choose a conversation and type your reply.",
            ],
          },
          { type: "open", href: "/admin/chat", label: "Open Live chat" },
        ],
      },
      {
        title: "Turning chat on or off",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Chat behaviour, opening hours and its texts are in **Site settings**, **Live chat**.",
          },
        ],
      },
    ],
  },
]
