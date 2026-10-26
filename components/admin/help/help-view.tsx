import { FormCard } from "@/components/admin/form/form-ui"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

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

export type HelpTopic = {
  id: string
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
    id: "services",
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
    id: "people",
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
    id: "activity",
    title: "See who changed something",
    summary:
      "Activity log records sign-ins, edits and publishes by everyone on the team.",
    steps: [
      "Open Activity log and filter by person, action or date.",
      "Select a row to see its details, including what changed.",
    ],
  },
]

/**
 * The Help page (dock): how-to answers for the people who run the website,
 * keyboard shortcuts, and the owners to ask for access or a reset.
 */
export function HelpView({ owners }: { owners: OwnerContact[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <FormCard
        id="help-topics"
        title="How do I…"
        description="Short answers for everyday jobs on the website."
        className="xl:col-span-2"
      >
        <div className="flex flex-col divide-y divide-border">
          {HELP_TOPICS.map((topic) => (
            <details key={topic.id} id={topic.id} className="group py-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground marker:text-muted-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11">
                {topic.title}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                {topic.summary}
              </p>
              <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground">
                {topic.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </FormCard>
      <FormCard id="help-shortcuts" title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-sm">
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={action} className="contents">
              <dt className="flex flex-wrap items-center gap-1.5">
                {keys.map((combo, index) => (
                  <span
                    key={combo.join("+")}
                    className="flex items-center gap-1.5"
                  >
                    {index > 0 ? (
                      <span className="text-xs text-muted-foreground">or</span>
                    ) : null}
                    <KbdGroup>
                      {combo.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </span>
                ))}
              </dt>
              <dd className="text-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </FormCard>
      <FormCard
        id="help-contact"
        title="Who to contact"
        description="Owners can invite people, change roles and reset access."
      >
        {owners.length > 0 ? (
          <ul className="flex flex-col gap-3 text-sm">
            {owners.map((owner) => (
              <li key={owner.email} className="flex min-w-0 flex-col">
                <span className="font-semibold text-foreground">
                  {owner.name}
                </span>
                {/* 44 px tall on coarse pointers; the inner span truncates. */}
                <a
                  href={`mailto:${owner.email}`}
                  className="inline-flex w-fit max-w-full items-center text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
                >
                  <span className="truncate">{owner.email}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            There is no active owner yet. Ask whoever set up the site.
          </p>
        )}
      </FormCard>
    </div>
  )
}
