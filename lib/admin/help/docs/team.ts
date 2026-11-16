import type { HelpArticle } from "../types"

export const TEAM_DOCS: readonly HelpArticle[] = [
  {
    slug: "users-and-roles",
    title: "Users and roles",
    group: "team",
    description: "Invite people and choose what each one can do.",
    lead: "Everyone signs in with their own account. A role decides which parts of the admin they can open.",
    permission: { user: ["read"] },
    keywords: [
      "users",
      "invite",
      "roles",
      "owner",
      "admin",
      "editor",
      "author",
      "permissions",
    ],
    sections: [
      {
        title: "Invite someone",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Users & roles** and choose **Invite**.",
              "Type their email and pick a role.",
              "They get an email with a link to set their password.",
            ],
          },
          { type: "open", href: "/admin/users", label: "Open Users & roles" },
        ],
      },
      {
        title: "The roles",
        blocks: [
          {
            type: "list",
            items: [
              "**Owner**: everything, including people and the most sensitive settings.",
              "**Admin**: everything for running the site, including users, but not owner-only actions.",
              "**Editor**: pages, services, jobs, articles, media, SEO and content settings.",
              "**Author**: writes articles and sends them for review; can add pictures.",
              "**Marketer**: SEO, redirects and marketing; can read the content.",
              "**Intake**: handles enquiries and live chat only.",
              "**Viewer**: can look at everything but change nothing.",
            ],
          },
        ],
      },
      {
        title: "Removing access",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Open the person to change their role, sign them out everywhere or ban the account.",
          },
        ],
      },
    ],
  },
  {
    slug: "activity-log",
    title: "Activity log",
    group: "team",
    description: "See who changed what, and when.",
    lead: "The activity log records publishing, deleting, sign-ins and settings changes, with the person and the time.",
    permission: { audit: ["read"] },
    keywords: ["audit", "history", "who changed", "log"],
    sections: [
      {
        title: "Reading it",
        blocks: [
          {
            type: "p",
            text: "Newest first. Filter by person or kind of action to find a particular change.",
          },
          { type: "open", href: "/admin/activity", label: "Open Activity log" },
        ],
      },
    ],
  },
  {
    slug: "your-account",
    title: "Your account",
    group: "team",
    description: "Your details, password, two-factor and signed-in devices.",
    lead: "Account is yours alone: your name, password and how you sign in.",
    keywords: [
      "profile",
      "password",
      "two-factor",
      "2fa",
      "sessions",
      "devices",
    ],
    sections: [
      {
        title: "What you can do there",
        blocks: [
          {
            type: "list",
            items: [
              "Change your name and password.",
              "Turn on two-factor and save your backup codes somewhere safe.",
              "See the devices you are signed in on and sign any of them out.",
              "Sessions end by themselves after a period of inactivity; signing in again is all it takes.",
            ],
          },
          { type: "open", href: "/admin/account", label: "Open Account" },
        ],
      },
    ],
  },
]
