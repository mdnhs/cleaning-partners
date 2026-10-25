import "server-only"

import type { Seo } from "@/lib/schemas/common"
import type { ArticleContent } from "@/lib/schemas/content/article"

import type { MediaLookup } from "./media"
import { checklist, doc, heading2, lead, paragraph, quote } from "./rich-text"

export type ArticleFixture = {
  slug: string
  categorySlug: string
  /** Published as a column; the display date in Europe/Dublin is the date part. */
  publishedAt: Date
  readTimeMinutes: number | null
  content: ArticleContent
  seo: Seo
}

/** 09:00 UTC (10:00 Irish summer time) on the given day. */
const on = (day: string) => new Date(`${day}T09:00:00Z`)

/**
 * Copied verbatim from lib/blog-posts.ts at 3689369, newest first. Only
 * "5-signs…" has a designed body (R3-4 mapping); the others keep the
 * nullable rule: lead null, no tags, body null (the page shows the excerpt).
 * The first is the blog's featured article (pages.blog.featuredArticle).
 */
export function articlesFixture(media: MediaLookup): ArticleFixture[] {
  return [
    {
      slug: "deep-cleaning-vs-regular-cleaning-what-your-business-needs",
      categorySlug: "commercial",
      publishedAt: on("2026-09-28"),
      readTimeMinutes: 6,
      seo: {},
      content: {
        title: "Deep Cleaning vs Regular Cleaning: What Your Business Needs",
        excerpt:
          "Daily and weekly cleaning keeps things tidy, but a deep clean reaches the places regular visits miss. Here is how to plan both around your business.",
        cover: media("/images/home/hero.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
    {
      slug: "5-signs-your-office-needs-a-professional-clean",
      categorySlug: "commercial",
      publishedAt: on("2026-09-15"),
      readTimeMinutes: 5,
      seo: {},
      content: {
        title: "5 Signs Your Office Needs a Professional Clean",
        excerpt:
          "From dusty vents to tired carpets: what to look out for, and how often to book a deep clean.",
        cover: media("/images/home/vacuuming.png"),
        lead: null,
        tags: ["Commercial", "Office Cleaning", "Tips"],
        body: doc(
          lead(
            "A clean office is about more than appearances. It shapes how your team feels at work, how visitors see your business and how quickly coughs and colds spread around the building. Here are five signs it's time to call in the professionals."
          ),
          heading2("1. Dust is building up on vents and high surfaces"),
          paragraph(
            "If you can see dust on air vents, skirting boards and the tops of cabinets, it is also circulating in the air your team breathes. Regular dusting of office space is part of every commercial schedule we put together."
          ),
          heading2("2. Carpets and floors are looking tired"),
          paragraph(
            "Grey traffic lanes, marks around desks and dull hard floors make a workspace feel neglected. Regular hoovering, plus floor buffing and polishing on request, brings them back to life."
          ),
          heading2("3. More staff are calling in sick"),
          paragraph(
            "Shared desks, kitchens and door handles are where germs travel fastest. Disinfecting high-touch surfaces, and ULV fogging for larger areas, helps cut the spread of illness."
          ),
          quote(
            "We customise a cleaning schedule with every client to meet their daily, weekly and monthly needs.",
            "The Clean Team"
          ),
          heading2("4. Bathrooms and staff rooms need constant attention"),
          paragraph(
            "If someone is always wiping down the kitchen or restocking the bathroom, these areas need a proper daily or weekly clean, not a quick tidy."
          ),
          heading2("5. Your team is cleaning instead of working"),
          paragraph(
            "Every hour staff spend cleaning is an hour away from their real job. A professional team works around your schedule, so the office is ready when everyone arrives."
          ),
          heading2("How often should you book a deep clean?"),
          paragraph(
            "Most offices benefit from a regular clean several times a week, with a deep clean every few months. Busy sites with lots of visitors may need daily cleaning. The right answer depends on your space, your team and your industry, which is why we always start with a conversation."
          ),
          checklist(
            "Daily or weekly cleaning of office space",
            "Bathrooms, showers, staff rooms and canteens",
            "Floor buffing and polishing on request",
            "Disinfecting and ULV fogging"
          )
        ),
      },
    },
    {
      slug: "infection-control-cleaning-in-healthcare-settings",
      categorySlug: "medical",
      publishedAt: on("2026-09-02"),
      readTimeMinutes: null,
      seo: {},
      content: {
        title: "Infection Control Cleaning in Healthcare Settings",
        excerpt:
          "Why medical cleaning follows stricter standards, and how our teams are trained to meet them.",
        cover: media("/images/home/cleaning-the-counter.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
    {
      slug: "how-to-get-stubborn-stains-out-of-curtains",
      categorySlug: "domestic",
      publishedAt: on("2026-08-20"),
      readTimeMinutes: null,
      seo: {},
      content: {
        title: "How to Get Stubborn Stains Out of Curtains",
        excerpt:
          "Our team's advice on fabrics, from red wine spills to everyday marks.",
        cover: media("/images/home/blog-curtains.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
    {
      slug: "what-is-ulv-fogging-and-when-do-you-need-it",
      categorySlug: "ulv-fogging",
      publishedAt: on("2026-08-05"),
      readTimeMinutes: null,
      seo: {},
      content: {
        title: "What Is ULV Fogging and When Do You Need It?",
        excerpt:
          "How an ultra low volume mist disinfects large, hard-to-reach areas in a very short time.",
        cover: media("/images/home/hero.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
    {
      slug: "keeping-schools-clean-through-term-and-holidays",
      categorySlug: "education",
      publishedAt: on("2026-07-22"),
      readTimeMinutes: null,
      seo: {},
      content: {
        title: "Keeping Schools Clean Through Term and Holidays",
        excerpt:
          "Planning weekly cleans and deep cleans around school holidays and closures.",
        cover: media("/images/home/vacuuming.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
    {
      slug: "retail-cleaning-why-first-impressions-count",
      categorySlug: "retail",
      publishedAt: on("2026-07-08"),
      readTimeMinutes: null,
      seo: {},
      content: {
        title: "Retail Cleaning: Why First Impressions Count",
        excerpt:
          "Spotless floors, windows and fitting rooms help customers feel welcome from the door.",
        cover: media("/images/home/blog-curtains.png"),
        lead: null,
        tags: [],
        body: null,
      },
    },
  ]
}
