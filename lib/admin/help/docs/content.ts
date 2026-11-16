import type { HelpArticle } from "../types"

export const CONTENT_DOCS: readonly HelpArticle[] = [
  {
    slug: "blog",
    title: "Write and publish a blog article",
    group: "content",
    description:
      "Write, schedule and publish articles, and group them in categories.",
    lead: "Articles live in Website, Blog. Write one, preview it, then publish now or schedule it.",
    permission: { article: ["read"] },
    keywords: ["blog", "article", "post", "category", "schedule", "review"],
    sections: [
      {
        title: "Write an article",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Website**, **Blog** and choose **New article**.",
              "Type the title and choose a category, then write the article.",
              "Add a cover picture and a short summary for the list and search results.",
              "Use **Preview** to see it on the site, then **Publish**.",
            ],
          },
          { type: "open", href: "/admin/blog", label: "Open Blog" },
        ],
      },
      {
        title: "Review and scheduling",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "An author sends an article for review instead of publishing it; an editor or admin approves and publishes. You can also choose a date and time to publish it later.",
          },
        ],
      },
      {
        title: "Categories",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Categories group the articles on the blog page. Add and rename them in **Blog**, **Categories**.",
          },
        ],
      },
    ],
  },
  {
    slug: "careers",
    title: "Post a job",
    group: "content",
    description:
      "Add a role to the Careers page and close it when it is filled.",
    lead: "Jobs shown on /careers are managed in Website, Careers. The applications people send arrive under Job applications.",
    permission: { job: ["read"] },
    keywords: ["job", "vacancy", "careers", "apply", "hiring", "close"],
    sections: [
      {
        title: "Post a job",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Website**, **Careers**, then **Jobs**, and choose **New job**.",
              "Fill in the title, location, hours, pay and the role's details.",
              "Press **Publish**. The job appears under Open Positions with its own page and application form.",
            ],
          },
          { type: "open", href: "/admin/careers", label: "Open Jobs" },
        ],
      },
      {
        title: "Closing a job",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "When the role is filled, press **Close**. It moves to Previous Openings and its form stops taking applications. A closing date closes it by itself.",
          },
        ],
      },
      {
        title: "The words on the Careers page",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "The text of the Careers pages and the application form's questions are edited in **Website**, **Careers**.",
          },
        ],
      },
    ],
  },
  {
    slug: "media-library",
    title: "Media library",
    group: "content",
    description: "Upload, find and reuse images.",
    lead: "Every picture on the site lives in the Media library, so you can reuse it anywhere and see where it is used.",
    permission: { media: ["read"] },
    keywords: ["images", "upload", "photos", "alt text", "files"],
    sections: [
      {
        title: "Uploading",
        blocks: [
          {
            type: "steps",
            items: [
              "Open **Media** and drop pictures onto the page, or choose files.",
              "Open one to add a short description (alt text) that describes what it shows.",
              "**Save details**.",
            ],
          },
          { type: "open", href: "/admin/media", label: "Open Media" },
        ],
      },
      {
        title: "Using a picture",
        level: 3,
        blocks: [
          {
            type: "p",
            text: "Wherever a page asks for an image, choose **Change image** and pick from the library, or upload a new one right there.",
          },
        ],
      },
      {
        title: "Deleting",
        level: 3,
        blocks: [
          {
            type: "callout",
            tone: "warning",
            text: "A picture that a page still uses cannot be deleted. The library tells you where it is used.",
          },
        ],
      },
    ],
  },
]
