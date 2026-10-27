import { HelpDocs } from "@/components/admin/help/help-docs"

export type OwnerContact = { name: string; email: string }

/** ⌘ on a Mac, Ctrl elsewhere: both are listed (the page renders on the server). */
export const SHORTCUTS: { keys: string[][]; action: string }[] = [
  {
    keys: [
      ["⌘", "K"],
      ["Ctrl", "K"],
    ],
    action: "Search and go",
  },
  {
    keys: [
      ["⌘", "J"],
      ["Ctrl", "J"],
    ],
    action: "AI assistant",
  },
  {
    keys: [
      ["⌘", "S"],
      ["Ctrl", "S"],
    ],
    action: "Save draft",
  },
  { keys: [["Esc"]], action: "Close panels" },
]

export type HelpGroupId = "content" | "inbox" | "team"

/** The outline's sections, in order. */
export const HELP_GROUPS: readonly { id: HelpGroupId; title: string }[] = [
  { id: "content", title: "Website content" },
  { id: "inbox", title: "Blog and enquiries" },
  { id: "team", title: "Team and account" },
]

export type HelpTopic = {
  id: string
  group: HelpGroupId
  title: string
  /** Short answer, then the steps. */
  summary: string
  steps: string[]
}

/**
 * Plain-language answers for the people who run the Cleaning Partners
 * website. Each one names a screen in the left menu; the page is pinned by
 * tests/unit/admin/help-topics.test.ts (every topic has steps, and nothing
 * from another business sneaks in).
 */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "edit-a-page",
    group: "content",
    title: "Change the words or pictures on a page",
    summary:
      "Pages lists every page of the site. Open one, change what you need, then publish.",
    steps: [
      "Open Pages in the left menu and choose the page, for example Home or About.",
      "Edit a section's text, button or image. Changes save to a draft by themselves, so the live site does not change yet.",
      "Use the preview to see the page as visitors will, on a phone or a computer.",
      "Press Publish and check the list of changes. The site updates within a few seconds.",
      "Made a mistake? Open History and restore an earlier version.",
    ],
  },
  {
    id: "build-a-page",
    group: "content",
    title: "Build a new page from blocks",
    summary:
      "Pages you add yourself are put together from ready-made blocks and live under /p/ on the site.",
    steps: [
      "Open Pages and choose New page. You can also find it with the search (Ctrl or ⌘ K).",
      "Add blocks one by one and fill in each. Changes save to a draft by themselves.",
      "Press Publish. The page appears at /p/ followed by its address (slug).",
      "If you change the address of a published page, the old link is sent to the new one.",
      "To start from an existing page, open it and choose Copy to new page. The blog copy needs a Blog block added by hand, because its filterable list is not a normal section.",
    ],
  },
  {
    id: "services",
    group: "content",
    title: "Add or edit a cleaning service",
    summary:
      "Each service has its own page, plus a card on the Services page and the home page.",
    steps: [
      "Open Services and choose New service, or open one to edit it.",
      "Fill in the name, the card text, the banner text and picture, and what is included.",
      "List the places you clean (offices, homes, clinics and so on) so visitors see them on the page.",
      "A new service starts as a draft and stays hidden until you publish it.",
      "Choose Change order, then drag services to change the order they show on the site.",
    ],
  },
  {
    id: "testimonials",
    group: "content",
    title: "Add a customer testimonial",
    summary:
      "Testimonials live under Collections and appear in the reviews section of the site.",
    steps: [
      "Open Collections, then Testimonials, and choose Add testimonial.",
      "Enter the customer's name, their initials and the quote, then pick a rating from 1 to 5 stars.",
      "Save. Testimonials go live straight away: there is no separate publish step.",
      "Choose Change order, then drag rows to change the order, or delete a testimonial you no longer want to show.",
    ],
  },
  {
    id: "team-clients",
    group: "content",
    title: "Update the team, clients and group companies",
    summary:
      "These short lists sit together under Collections and work the same way as testimonials.",
    steps: [
      "Open Collections and choose Team, Clients or Group companies.",
      "Add a person or company, edit a row, or choose Change order and drag to reorder.",
      "Changes show on the live site as soon as you save.",
    ],
  },
  {
    id: "blog",
    group: "inbox",
    title: "Write and publish a blog article",
    summary:
      "Blog holds your news and cleaning tips. Authors write, editors publish.",
    steps: [
      "Open Blog and choose New article.",
      "Write the title and the article, add a cover picture and choose a category.",
      "Authors can send an article for review. An editor then publishes it, or schedules it for a later date.",
      "Categories are managed under Blog, then Categories.",
    ],
  },
  {
    id: "enquiries",
    group: "inbox",
    title: "Handle enquiries from the contact form",
    summary:
      "Every message sent through the site's contact form arrives under Enquiries.",
    steps: [
      "Open Enquiries to see new messages first. The number beside the menu item counts the ones nobody has picked up.",
      "Open a message, assign it to someone on the team and reply by email or phone.",
      "Change its status as you go: New, Contacted, Qualified, Won or Lost.",
      "Messages marked as spam are hidden from the main list. Filter by Spam to find one marked by mistake.",
    ],
  },
  {
    id: "media",
    group: "content",
    title: "Upload and reuse pictures",
    summary:
      "Pictures are chosen from the media library wherever a page asks for an image.",
    steps: [
      "Press Choose image on any picture field, then upload a new file or pick one you already have.",
      "Add a short description (alt text) so the picture works for people using screen readers.",
      "Use large, sharp photos for banners. Uploaded pictures are cleaned of hidden camera and location data.",
      "The Media screen lists everything uploaded and where each file is used.",
    ],
  },
  {
    id: "settings",
    group: "content",
    title: "Change phone, email, address and menus",
    summary:
      "Site settings holds the details that repeat across the whole site.",
    steps: [
      "Open Site settings and choose Contact details to change the phone number, email, address or opening hours.",
      "Use Navigation for the header and footer menus, and Footer for the closing text and links.",
      "The other tabs edit the shared sections, such as Why choose us, Testimonials section and How it works.",
      "Settings save to a draft first: press Publish to put them on the live site.",
    ],
  },
  {
    id: "appearance",
    group: "content",
    title: "Change the site colours",
    summary:
      "Appearance sets the colours of the public site and of this admin. Owners and administrators can change it.",
    steps: [
      "Open Appearance in the left menu and pick the colours you want. Changes save to a draft first.",
      "Press Publish. If a colour pair is too hard to read, you are asked to fix the contrast issues before publishing.",
      "The default theme is the original look of the site, so you can always go back to it.",
    ],
  },
  {
    id: "people",
    group: "team",
    title: "Invite a colleague and choose what they can do",
    summary:
      "Owners and administrators manage the team under Users & roles. Roles decide what each person can change.",
    steps: [
      "Open Users & roles and choose Invite user, then enter their name and email.",
      "Pick a role: for example an editor can publish, an author can only write drafts.",
      "If email is not set up yet, copy the invitation link and send it to them yourself.",
      "Turn on two-factor sign-in under your own Account for extra protection.",
    ],
  },
  {
    id: "signin",
    group: "team",
    title: "Sign in, passwords and two-factor",
    summary:
      "Staying signed in, choosing a password and what to do when you are locked out.",
    steps: [
      "You stay signed in for about 7 days. The clock restarts whenever you use the admin.",
      "Passwords are 12 to 128 characters long. Change yours, or turn on two-factor sign-in, under Account.",
      "Too many wrong attempts in a minute pauses sign-in for a short while. Wait, then try again.",
      "Locked out or lost your two-factor device? Ask an owner (see Who to contact below). They can reset your access.",
    ],
  },
  {
    id: "ai",
    group: "team",
    title: "Use the AI assistant",
    summary:
      "The assistant answers questions about the site's content. It can look but never change anything.",
    steps: [
      "Press Ctrl or ⌘ J to open it, and ask your question in plain words.",
      "Only the roles the owner has allowed can use it. If it is missing for you, ask an owner.",
      "There is a limit of 30 messages every 10 minutes for each person.",
      "Your conversations are kept until you delete them.",
    ],
  },
  {
    id: "activity",
    group: "team",
    title: "See who changed something",
    summary:
      "Activity log records sign-ins, edits and publishes by everyone on the team.",
    steps: [
      "Open Activity log and filter by person, action or date.",
      "Select a row to see its details, including what changed.",
    ],
  },
]

export type HelpGuide = {
  /** Exactly a `## ` heading of docs/runbook.md. */
  title: string
  summary: string
  steps: string[]
}

/**
 * Sections of docs/runbook.md (not served by the site), written up here for
 * the people who run it; tests/unit/admin/help-guides.test.ts pins each title
 * to a `## ` heading there. Jobs only the person who hosts the site can do are
 * marked as such.
 */
export const HELP_GUIDES: readonly HelpGuide[] = [
  {
    title: "Owner locked out",
    summary:
      "If the only owner cannot sign in, whoever hosts the site can restore access.",
    steps: [
      "Ask another owner first. Owners are listed under Who to contact.",
      "If there is no other owner, ask whoever hosts the site to run the owner recovery script for your email address.",
      "It turns off two-factor for you, ends your old sessions and cancels older links. You get a one-time password link that works for 24 hours (also emailed when email is set up).",
      "Set a new password, then turn two-factor back on under Account.",
    ],
  },
  {
    title: "Sessions and sign-in",
    summary:
      "How long you stay signed in, and the limits that protect sign-in.",
    steps: [
      "A session lasts 7 days and is extended while you use the admin, so in practice you are signed out after about 7 days of not using it.",
      "Passwords are 12 to 128 characters long.",
      "Limits on sign-in: 5 sign-in attempts and 5 two-factor attempts a minute, and 3 password resets every 5 minutes. Wait a moment and try again.",
      "Ending someone's session takes effect straight away on every admin page.",
      "While an administrator is using View as, account settings and the AI assistant are read-only.",
    ],
  },
  {
    title: "Page builder",
    summary:
      "Pages you add yourself are built from 15 blocks and live at /p/ followed by their address.",
    steps: [
      "Open Pages and choose New page. Changes save to a draft by themselves, and Publish checks the whole page.",
      "If a save is refused because the page changed meanwhile, reload it and make your change again.",
      "Two pages cannot share an address. Renaming the address of a published page keeps the old link working.",
      "Deleting a page can send its address to the home page. Without that option the old address shows a not-found page.",
      "Pages built this way appear in the sitemap and have an SEO tab and a preview like the other pages.",
    ],
  },
  {
    title: "AI assistant",
    summary:
      "Owners and administrators set up the assistant under Settings, then AI assistant.",
    steps: [
      "Choose the provider and model, paste the API key and pick which roles may use it. The key is stored encrypted and is not kept anywhere else.",
      "Use Test connection to check the key works. If you leave out owner and administrator from the allowed roles, those roles lose access until the list is saved again.",
      "Share enquiry details lets the assistant read enquiries. Only an owner can turn it on, and changing the provider turns it off again. With it on, names, companies and messages go to the provider.",
      "Addresses and Eircodes typed into a message are not hidden before they are sent.",
      "The assistant can only read. It opens with Ctrl or ⌘ J, and each person can send 30 messages every 10 minutes.",
    ],
  },
  {
    title: "Backups and the restore drill",
    summary:
      "The site backs up its database every day by itself. Setting up storage is the part to check.",
    steps: [
      "A backup runs each day and the newest 14 are kept. Pending invitations, password links and short-lived counters are not included.",
      "Backups are stored in your R2 bucket once R2 is saved under Settings, then Integrations. Until then they stay on the server's disk and are lost with it, so set up R2 early.",
      "A failing backup shows on the dashboard as Background jobs need attention and is retried every minute.",
      "Once after the first backup, then monthly and after any database upgrade, whoever hosts the site should run the restore drill. It restores the newest backup to a scratch database and compares the row counts.",
    ],
  },
  {
    title: "Restore a backup",
    summary:
      "Only the person who hosts the site can do this. It replaces the live data with a backup.",
    steps: [
      "Stop the app so nothing writes while you restore.",
      "Get the backup file and check its checksum against the manifest stored beside it.",
      "Restore it into the database, then release the job locks the backup captured.",
      "Start the app, check the health address and sign in.",
      "Re-send any invitations and password links: pending ones do not come back. Sessions stay valid.",
    ],
  },
  {
    title: "Custom code and Content-Security-Policy",
    summary:
      "Only an owner can add scripts and tracking codes, under Marketing, then Custom code.",
    steps: [
      "Each snippet is a script address or a block of HTML, with a place on the page, the pages it runs on and a consent type. You can have up to 20.",
      "Necessary snippets always run. Analytics and marketing snippets wait until the visitor accepts that kind in the cookie banner.",
      "Only paste code from vendors you trust: it runs with full access to every visitor's page.",
      "Switch all custom code off stops every snippet at once. Turn it off again and publish to bring them back.",
      "Tracking IDs (Google Tag Manager, Google Analytics, Meta Pixel) can only be changed by an owner, and load nothing until a visitor consents.",
    ],
  },
  {
    title: "Background jobs",
    summary:
      "The site runs a few tasks by itself every minute, so nothing needs pressing.",
    steps: [
      "Scheduled articles are published within about a minute of their time.",
      "Old versions are cleaned up daily, keeping the newest 50 of each page or article.",
      "Enquiries older than the retention period are deleted daily (24 months unless changed).",
      "A picture you replace stays at its old address for 24 hours, so open pages keep their images, and is then deleted.",
      "A failed job shows on the dashboard as Background jobs need attention and is retried after a minute.",
    ],
  },
]

/**
 * The Help page (dock): laid out like a docs site, with how-to answers for the
 * people who run the website, runbook guides, keyboard shortcuts, and the
 * owners to ask for access or a reset.
 */
export function HelpView({ owners }: { owners: OwnerContact[] }) {
  return (
    <HelpDocs
      topics={HELP_TOPICS}
      groups={HELP_GROUPS}
      guides={HELP_GUIDES}
      shortcuts={SHORTCUTS}
      owners={owners}
    />
  )
}
