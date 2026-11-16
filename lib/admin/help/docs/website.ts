import type { HelpArticle } from "../types"

export const WEBSITE_DOCS: readonly HelpArticle[] = [
  {
    slug: "website-overview",
    title: "How the Website area works",
    group: "website",
    description:
      "One screen per page, with its sections in the order visitors see them.",
    lead: "Website lists every page of the site on the left. Open a page and everything on it is in one place: edit, preview and publish together.",
    permission: { page: ["read"] },
    keywords: ["pages", "sections", "order", "website"],
    sections: [
      {
        title: "A page is its sections",
        blocks: [
          {
            type: "p",
            text: "Each page shows its sections as cards, top to bottom, in the same order as on the live page. A section can be a page's own text, a section shared with other pages (like **Why choose us**) or a list (like **Client logos**).",
          },
          {
            type: "open",
            href: "/admin/website/home",
            label: "Open Home",
          },
        ],
      },
      {
        title: "Shared sections",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Some sections appear on several pages, for example Clients strip, Why choose us, Testimonials, the Team section and the Contact section. You edit them where they first appear; the change shows everywhere they are used.",
          },
        ],
      },
      {
        title: "Lists inside a page",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Under their section you find the lists: **Client logos**, **Testimonials**, **Team members**. Add, edit, reorder or delete rows there. They have no draft, so changes are live at once.",
          },
        ],
      },
      {
        title: "The other screens",
        blocks: [
          {
            type: "list",
            items: [
              "**Services**: the cards on the Services page, with an on/off switch each. See [Services](/admin/help/services).",
              "**Header & footer**: the menu, the footer and shared labels. See [Header and footer](/admin/help/header-and-footer).",
              "**Custom pages** and **Legal pages**: pages you build yourself. See [Custom and legal pages](/admin/help/custom-and-legal-pages).",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "edit-a-page",
    title: "Change the words or pictures on a page",
    group: "website",
    description: "Edit a page's text, buttons and images, then publish.",
    lead: "The everyday job: open a page, change what you need, check it in the preview and publish.",
    permission: { page: ["read"] },
    keywords: [
      "edit",
      "text",
      "image",
      "photo",
      "button",
      "link",
      "home",
      "about",
    ],
    sections: [
      {
        title: "Edit and publish",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Website** and choose the page, for example **Home** or **About**.",
              "Find the section and change its text, button or image. It saves to a draft by itself.",
              "Look at the **Preview** beside the form. It scrolls to the section you are editing.",
              "Press **Publish** and confirm.",
            ],
          },
        ],
      },
      {
        title: "Images",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Choose **Change image** to pick from the Media library or upload a new picture. Add a short description so the image works for people using a screen reader.",
          },
        ],
      },
      {
        title: "Links and buttons",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "A link field takes an address such as `/contact`, a full web address, or a phone or email link. **Pick** lets you choose one of the site's own pages instead of typing it.",
          },
        ],
      },
      {
        title: "Copy that follows your details",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Text like `{quoteHref}` or `{phone24h}` is filled in from Site settings, Contact details. Leave it as it is and the page stays right when your details change.",
          },
        ],
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    group: "website",
    description:
      "Add, reorder, switch on or off and edit the cleaning services.",
    lead: "Each service has a card on the Services page and the home page, and its own page at /services/<name>. Manage them all from the Services screen.",
    permission: { service: ["read"] },
    keywords: ["service", "card", "visible", "hide", "order", "add service"],
    sections: [
      {
        title: "The services list",
        blocks: [
          {
            type: "p",
            text: "Open **Website**, **Services**. Under the **Services grid** section is the list of every service. Drag the handle (or use the arrows) to reorder; the site shows the new order straight away.",
          },
          {
            type: "open",
            href: "/admin/website/services",
            label: "Open Services",
          },
        ],
      },
      {
        title: "Showing or hiding a service",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "The switch on each row turns a service on or off for the site. Off hides its card, its page and its place in the quote form's list, but keeps everything you wrote. A published service goes live or off at once; an unpublished one only changes its draft.",
          },
        ],
      },
      {
        title: "Adding and deleting",
        level: 3,
        blocks: [
          {
            type: "steps",
            items: [
              "Choose **Add service**.",
              "Fill in the name, then the card text, banner picture and what is included.",
              "A new service starts as a draft. **Publish** it to put it on the site.",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            text: "**Delete** removes the card and the page for good. To keep it for later, switch it off instead.",
          },
        ],
      },
      {
        title: "Editing one service",
        blocks: [
          {
            type: "p",
            text: "The pencil opens the service. **Card** has its name, address (slug), card text and icon. **Details** has the banner, overview, what is included and the places you clean. **SEO** has its search title and description. Changing the address moves the page and the old link redirects.",
          },
        ],
      },
      {
        title: "How it works",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "The steps shown on every service page are edited in **Website**, **How it works**.",
          },
        ],
      },
    ],
  },
  {
    slug: "header-and-footer",
    title: "Header and footer",
    group: "website",
    description: "The menu, the footer and the shared labels in one place.",
    lead: "Header & footer is one editor with three tabs: Header, Footer and Forms & microcopy. One draft, one preview, one Publish.",
    permission: { settings: ["read"] },
    keywords: [
      "menu",
      "navbar",
      "navigation",
      "footer",
      "dropdown",
      "group companies",
      "microcopy",
    ],
    sections: [
      {
        title: "Header",
        blocks: [
          {
            type: "p",
            text: "The links across the top of every page, the highlighted button and the texts of the phone menu. Reorder links with the arrows.",
          },
          {
            type: "list",
            items: [
              "**Dropdown links**: add links under any menu item and it gets a drop-down arrow. Leave it empty for a plain link. The Services link lists the published services by itself when it has none of its own.",
              "**Show in the footer**: switch a link off to keep it out of the footer's Quick links.",
              "On a phone each dropdown starts closed and opens when tapped.",
            ],
          },
          {
            type: "open",
            href: "/admin/website/header-footer",
            label: "Open Header & footer",
          },
        ],
      },
      {
        title: "Footer",
        blocks: [
          {
            type: "p",
            text: "The footer text and headings, the legal links and, at the end of the tab, the **Group companies** list. A company has a name, a phone line, its web address and a logo. Add, edit and reorder them there; they go live when you save.",
          },
        ],
      },
      {
        title: "Forms & microcopy",
        blocks: [
          {
            type: "p",
            text: 'Small texts shared by several pages: the blog\'s "View all posts" and "Read article", the search box, the quote card and the Page not found text.',
          },
        ],
      },
    ],
  },
  {
    slug: "custom-and-legal-pages",
    title: "Custom and legal pages",
    group: "website",
    description:
      "Build your own pages from blocks, and edit Privacy and Terms.",
    lead: "Pages you add yourself are put together from ready-made blocks. Legal pages (Privacy Policy, Terms) work the same way.",
    permission: { page: ["read"] },
    keywords: [
      "custom page",
      "landing page",
      "blocks",
      "legal",
      "privacy",
      "terms",
      "slug",
    ],
    sections: [
      {
        title: "Build a page",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Website**, **Custom pages** and choose **New page**.",
              "Give it a title and an address (slug).",
              "Add blocks one by one and fill each in. Changes save to a draft.",
              "Press **Publish**. The page appears at `/p/` followed by its address.",
            ],
          },
          {
            type: "open",
            href: "/admin/website/custom-pages",
            label: "Open Custom pages",
          },
        ],
      },
      {
        title: "Changing the address",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "If you change the address of a published page, the old link is sent to the new one automatically.",
          },
        ],
      },
      {
        title: "Legal pages",
        blocks: [
          {
            type: "p",
            text: "**Legal pages** lists the pages such as Privacy Policy and Terms and Conditions. Their links appear in the footer. Edit and publish them like any other page.",
          },
          {
            type: "open",
            href: "/admin/website/legal",
            label: "Open Legal pages",
          },
        ],
      },
    ],
  },
]
