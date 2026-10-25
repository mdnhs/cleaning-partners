export type ArticleBlock =
  | { type: "lead" | "h2" | "p"; text: string }
  | { type: "quote"; text: string; cite: string }
  | { type: "checklist"; items: string[] }

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string
  displayDate: string
  cover: string
  readTime?: string
  tags?: string[]
  /** Full article; posts without one show their excerpt until written */
  body?: ArticleBlock[]
}

// Newest first
export const blogPosts: BlogPost[] = [
  {
    slug: "deep-cleaning-vs-regular-cleaning-what-your-business-needs",
    title: "Deep Cleaning vs Regular Cleaning: What Your Business Needs",
    excerpt:
      "Daily and weekly cleaning keeps things tidy, but a deep clean reaches the places regular visits miss. Here is how to plan both around your business.",
    category: "Commercial",
    date: "2026-09-28",
    displayDate: "28 Sep 2026",
    cover: "/images/home/hero.png",
    readTime: "6 min read",
  },
  {
    slug: "5-signs-your-office-needs-a-professional-clean",
    title: "5 Signs Your Office Needs a Professional Clean",
    excerpt:
      "From dusty vents to tired carpets: what to look out for, and how often to book a deep clean.",
    category: "Commercial",
    date: "2026-09-15",
    displayDate: "15 Sep 2026",
    cover: "/images/home/vacuuming.png",
    readTime: "5 min read",
    tags: ["Commercial", "Office Cleaning", "Tips"],
    body: [
      {
        type: "lead",
        text: "A clean office is about more than appearances. It shapes how your team feels at work, how visitors see your business and how quickly coughs and colds spread around the building. Here are five signs it's time to call in the professionals.",
      },
      { type: "h2", text: "1. Dust is building up on vents and high surfaces" },
      {
        type: "p",
        text: "If you can see dust on air vents, skirting boards and the tops of cabinets, it is also circulating in the air your team breathes. Regular dusting of office space is part of every commercial schedule we put together.",
      },
      { type: "h2", text: "2. Carpets and floors are looking tired" },
      {
        type: "p",
        text: "Grey traffic lanes, marks around desks and dull hard floors make a workspace feel neglected. Regular hoovering, plus floor buffing and polishing on request, brings them back to life.",
      },
      { type: "h2", text: "3. More staff are calling in sick" },
      {
        type: "p",
        text: "Shared desks, kitchens and door handles are where germs travel fastest. Disinfecting high-touch surfaces, and ULV fogging for larger areas, helps cut the spread of illness.",
      },
      {
        type: "quote",
        text: "We customise a cleaning schedule with every client to meet their daily, weekly and monthly needs.",
        cite: "The Clean Team",
      },
      {
        type: "h2",
        text: "4. Bathrooms and staff rooms need constant attention",
      },
      {
        type: "p",
        text: "If someone is always wiping down the kitchen or restocking the bathroom, these areas need a proper daily or weekly clean, not a quick tidy.",
      },
      { type: "h2", text: "5. Your team is cleaning instead of working" },
      {
        type: "p",
        text: "Every hour staff spend cleaning is an hour away from their real job. A professional team works around your schedule, so the office is ready when everyone arrives.",
      },
      { type: "h2", text: "How often should you book a deep clean?" },
      {
        type: "p",
        text: "Most offices benefit from a regular clean several times a week, with a deep clean every few months. Busy sites with lots of visitors may need daily cleaning. The right answer depends on your space, your team and your industry, which is why we always start with a conversation.",
      },
      {
        type: "checklist",
        items: [
          "Daily or weekly cleaning of office space",
          "Bathrooms, showers, staff rooms and canteens",
          "Floor buffing and polishing on request",
          "Disinfecting and ULV fogging",
        ],
      },
    ],
  },
  {
    slug: "infection-control-cleaning-in-healthcare-settings",
    title: "Infection Control Cleaning in Healthcare Settings",
    excerpt:
      "Why medical cleaning follows stricter standards, and how our teams are trained to meet them.",
    category: "Medical",
    date: "2026-09-02",
    displayDate: "02 Sep 2026",
    cover: "/images/home/cleaning-the-counter.png",
  },
  {
    slug: "how-to-get-stubborn-stains-out-of-curtains",
    title: "How to Get Stubborn Stains Out of Curtains",
    excerpt:
      "Our team's advice on fabrics, from red wine spills to everyday marks.",
    category: "Domestic",
    date: "2026-08-20",
    displayDate: "20 Aug 2026",
    cover: "/images/home/blog-curtains.png",
  },
  {
    slug: "what-is-ulv-fogging-and-when-do-you-need-it",
    title: "What Is ULV Fogging and When Do You Need It?",
    excerpt:
      "How an ultra low volume mist disinfects large, hard-to-reach areas in a very short time.",
    category: "ULV Fogging",
    date: "2026-08-05",
    displayDate: "05 Aug 2026",
    cover: "/images/home/hero.png",
  },
  {
    slug: "keeping-schools-clean-through-term-and-holidays",
    title: "Keeping Schools Clean Through Term and Holidays",
    excerpt:
      "Planning weekly cleans and deep cleans around school holidays and closures.",
    category: "Education",
    date: "2026-07-22",
    displayDate: "22 Jul 2026",
    cover: "/images/home/vacuuming.png",
  },
  {
    slug: "retail-cleaning-why-first-impressions-count",
    title: "Retail Cleaning: Why First Impressions Count",
    excerpt:
      "Spotless floors, windows and fitting rooms help customers feel welcome from the door.",
    category: "Retail",
    date: "2026-07-08",
    displayDate: "08 Jul 2026",
    cover: "/images/home/blog-curtains.png",
  },
]

export function getPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug)
}

export const blogCategories = [
  "Medical",
  "Commercial",
  "Domestic",
  "Education",
  "Retail",
  "ULV Fogging",
]
