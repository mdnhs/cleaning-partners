import type { HelpArticle } from "../types"

export const START_DOCS: readonly HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    group: "start",
    description: "Sign in, secure your account and find your way around.",
    lead: "Everything for your first visit: how to sign in, how to keep your account safe and where things live in the admin.",
    keywords: ["sign in", "login", "password", "layout", "sidebar", "search"],
    sections: [
      {
        title: "Signing in",
        blocks: [
          {
            type: "steps",
            items: [
              "Go to the admin address you were given.",
              "Type your **Email** and **Password**, then press **Sign in**.",
              "If two-factor is on, type the 6-digit code from your authenticator app.",
            ],
          },
          {
            type: "callout",
            tone: "note",
            text: "There is no sign-up page. New people join when an owner or admin invites them from Users & roles.",
          },
        ],
      },
      {
        title: "Forgotten your password?",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Choose **Forgot password?** on the sign-in screen, type your email and follow the link we send. Pick a new password of at least 12 characters.",
          },
        ],
      },
      {
        title: "Two-factor authentication",
        blocks: [
          {
            type: "p",
            text: "Two-factor asks for a code from an app on your phone as well as your password, so a stolen password alone is not enough. It is optional but strongly recommended for owners and admins.",
          },
          {
            type: "open",
            href: "/admin/account",
            label: "Open your account",
          },
        ],
      },
      {
        title: "Keyboard shortcuts",
        blocks: [
          {
            type: "list",
            items: [
              "`⌘K` (or `Ctrl K`): search and go to any page, setting or action.",
              "`⌘J` (or `Ctrl J`): the AI assistant.",
              "`⌘S` (or `Ctrl S`): save the draft now.",
              "`Esc`: close a panel or dialog.",
            ],
          },
        ],
      },
      {
        title: "Finding your way",
        blocks: [
          {
            type: "list",
            items: [
              "The **left menu** has the main areas: Dashboard, Website, Media, Enquiries, Job applications, Live chat, SEO, Marketing, Appearance and Site settings. You only see what your role can open.",
              "**Website** has its own list on the left of the page: Home, About, Services, How it works, Blog, Contact, Careers, Custom pages, Legal pages and Header & footer.",
              "Press `⌘K` (or `Ctrl K`) anywhere to search for a page, a setting or an action and jump to it.",
              "The icons at the bottom of the menu open Users & roles, the Activity log, Help and Log out.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "saving-and-publishing",
    title: "Saving and publishing",
    group: "start",
    description:
      "Drafts save by themselves; Publish is what puts a change on the site.",
    lead: "Most screens work on a draft. You can edit freely and the live site only changes when you press Publish.",
    keywords: ["draft", "publish", "preview", "history", "restore", "autosave"],
    sections: [
      {
        title: "Drafts save by themselves",
        blocks: [
          {
            type: "p",
            text: "Pages, services, articles, jobs and most settings save to a draft a moment after you stop typing. The label near the top reads **Saved** when it is safe. `⌘S` saves at once.",
          },
        ],
      },
      {
        title: "Previewing",
        blocks: [
          {
            type: "p",
            text: "The **Preview** beside the form shows your draft on the real site and refreshes as you save. Switch it between computer, tablet and phone. **Live preview** turns the side panel off if you want more room. The **Preview** button opens the draft in a new tab.",
          },
        ],
      },
      {
        title: "Publishing",
        blocks: [
          {
            type: "steps",
            items: [
              "Press **Publish**.",
              "Check the list of what changed.",
              "Confirm. The site updates within a few seconds.",
            ],
          },
          {
            type: "callout",
            tone: "tip",
            text: "On a page with several sections, one **Publish** publishes the whole page together, including the shared sections inside it.",
          },
        ],
      },
      {
        title: "Changed your mind?",
        blocks: [
          {
            type: "p",
            text: "Open **History** to see earlier versions and restore one into the draft. Nothing goes live until you publish it again.",
          },
        ],
      },
      {
        title: "What goes live straight away",
        blocks: [
          {
            type: "p",
            text: "Lists such as client logos, testimonials, team members and group companies have no draft: a change shows on the site as soon as you save it. The same goes for reordering them and for the on/off switch on a service.",
          },
        ],
      },
    ],
  },
]
