"use client"

import { ArrowLeft, ArrowRight, ChevronRight, Menu, Search } from "lucide-react"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"

import type {
  HelpGroupId,
  HelpGuide,
  HelpTopic,
  OwnerContact,
} from "@/components/admin/help/help-view"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

type Shortcut = { keys: string[][]; action: string }

type Entry = {
  id: string
  group: string
  title: string
  summary: string
  kind: "steps" | "shortcuts" | "contact"
  steps: string[]
  /** Everything searchable about the entry. */
  haystack: string
}

const FOCUS_RING =
  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

const MAIN_ID = "help-article-top"

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

function readHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1))
  } catch {
    return ""
  }
}

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" })
}

/**
 * The Help page laid out like a docs site: a sidebar outline on the left, one
 * article in the middle (chosen by the URL hash, so every answer has its own
 * link), and "On this page" on the right.
 */
export function HelpDocs({
  topics,
  groups,
  guides,
  shortcuts,
  owners,
}: {
  topics: readonly HelpTopic[]
  groups: readonly { id: HelpGroupId; title: string }[]
  guides: readonly HelpGuide[]
  shortcuts: readonly Shortcut[]
  owners: OwnerContact[]
}) {
  const sections = useMemo(() => {
    const make = (
      group: string,
      id: string,
      title: string,
      summary: string,
      steps: string[],
      kind: Entry["kind"] = "steps"
    ): Entry => ({
      id,
      group,
      title,
      summary,
      kind,
      steps,
      haystack: [title, summary, ...steps].join(" ").toLowerCase(),
    })
    return [
      ...groups.map((group) => ({
        title: group.title,
        entries: topics
          .filter((topic) => topic.group === group.id)
          .map((t) => make(group.title, t.id, t.title, t.summary, t.steps)),
      })),
      {
        title: "Guides",
        entries: guides.map((g) =>
          make("Guides", `guide-${slug(g.title)}`, g.title, g.summary, g.steps)
        ),
      },
      {
        title: "Reference",
        entries: [
          make(
            "Reference",
            "shortcuts",
            "Keyboard shortcuts",
            "Quick keys for the jobs you do most.",
            shortcuts.map((s) => s.action),
            "shortcuts"
          ),
          make(
            "Reference",
            "contact",
            "Who to contact",
            "Owners can invite people, change roles and reset access.",
            owners.map((o) => o.name),
            "contact"
          ),
        ],
      },
    ]
  }, [topics, groups, guides, shortcuts, owners])

  const entries = useMemo(() => sections.flatMap((s) => s.entries), [sections])

  const hash = useSyncExternalStore(subscribeToHash, readHash, () => "")
  const activeId = entries.some((e) => e.id === hash) ? hash : ""
  const [query, setQuery] = useState("")
  const [navOpen, setNavOpen] = useState(false)

  // Move to the top of the article when another one opens.
  useEffect(() => {
    if (activeId) scrollToId(MAIN_ID)
  }, [activeId])

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return sections
    return sections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((e) =>
          words.every((w) => e.haystack.includes(w))
        ),
      }))
      .filter((section) => section.entries.length > 0)
  }, [sections, query])
  const found = filtered.reduce((n, s) => n + s.entries.length, 0)

  const index = entries.findIndex((e) => e.id === activeId)
  const current = index >= 0 ? entries[index]! : null
  const previous = index > 0 ? entries[index - 1]! : null
  const next =
    index >= 0 && index < entries.length - 1 ? entries[index + 1]! : null

  const linkClass = (active: boolean) =>
    cn(
      "-ml-px block border-l py-1.5 pl-3 text-sm transition-colors focus-visible:rounded-sm pointer-coarse:py-2.5",
      FOCUS_RING,
      active
        ? "border-primary font-medium text-primary"
        : "border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    )

  return (
    <div className="grid overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      {/* Sidebar */}
      <div className="border-b p-4 lg:border-r lg:border-b-0 lg:p-5">
        <button
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-expanded={navOpen}
          aria-controls="help-outline"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-sm font-medium lg:hidden",
            FOCUS_RING
          )}
        >
          <Menu aria-hidden="true" className="size-4" />
          Browse help
        </button>
        <nav
          id="help-outline"
          aria-label="Help outline"
          className={cn(
            "mt-3 flex-col gap-5 lg:sticky lg:top-4 lg:mt-0 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto",
            navOpen ? "flex" : "hidden"
          )}
        >
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search help"
              placeholder="Search help…"
              className={cn(
                "h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm placeholder:text-muted-foreground",
                FOCUS_RING
              )}
            />
          </div>
          <p role="status" className="sr-only">
            {query.trim()
              ? `${found} ${found === 1 ? "result" : "results"}`
              : ""}
          </p>
          {!query.trim() ? (
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault()
                window.location.hash = ""
                setNavOpen(false)
                scrollToId(MAIN_ID)
              }}
              aria-current={activeId === "" ? "page" : undefined}
              className={cn(
                "rounded-md px-2 py-1.5 text-sm font-semibold focus-visible:rounded-sm",
                FOCUS_RING,
                activeId === "" ? "text-primary" : "text-foreground"
              )}
            >
              Overview
            </a>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              Nothing matches “{query.trim()}”. Try a shorter word.
            </p>
          ) : null}
          {filtered.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-2 text-sm font-semibold text-foreground">
                {section.title}
              </p>
              <ul className="ml-2 flex flex-col border-l">
                {section.entries.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      onClick={() => setNavOpen(false)}
                      aria-current={entry.id === activeId ? "page" : undefined}
                      className={linkClass(entry.id === activeId)}
                    >
                      {entry.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Article */}
      <div className="min-w-0 p-5 sm:p-8 lg:p-10">
        <span id={MAIN_ID} className="block scroll-mt-20" />
        {current ? (
          <Article
            entry={current}
            shortcuts={shortcuts}
            owners={owners}
            previous={previous}
            next={next}
          />
        ) : (
          <Overview sections={sections} />
        )}
      </div>

      {/* On this page */}
      <aside aria-label="On this page" className="hidden border-l p-5 xl:block">
        <div className="sticky top-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            On this page
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {(current
              ? current.kind === "steps"
                ? [
                    ["Overview", "help-overview"],
                    ["Steps", "help-steps"],
                    ["Need more help?", "help-more"],
                  ]
                : [
                    [current.title, "help-overview"],
                    ["Need more help?", "help-more"],
                  ]
              : sections.map((s) => [s.title, `help-section-${slug(s.title)}`])
            ).map(([label, id]) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => scrollToId(id!)}
                  className={cn(
                    "text-left text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm",
                    FOCUS_RING
                  )}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function Overview({
  sections,
}: {
  sections: { title: string; entries: Entry[] }[]
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header id="help-overview" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          How can we help?
        </h2>
        <p className="text-base text-muted-foreground">
          Short answers for everyday jobs on the website, plus keyboard
          shortcuts and who to ask. Pick a topic on the left, or search.
        </p>
      </header>
      {sections.map((section) => (
        <section
          key={section.title}
          id={`help-section-${slug(section.title)}`}
          aria-labelledby={`help-section-${slug(section.title)}-title`}
          className="scroll-mt-20"
        >
          <h3
            id={`help-section-${slug(section.title)}-title`}
            className="mb-3 border-b pb-2 text-lg font-semibold text-foreground"
          >
            {section.title}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.entries.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={cn(
                    "group flex h-full flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-muted/40",
                    FOCUS_RING
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                    {entry.title}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {entry.summary}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Article({
  entry,
  shortcuts,
  owners,
  previous,
  next,
}: {
  entry: Entry
  shortcuts: readonly Shortcut[]
  owners: OwnerContact[]
  previous: Entry | null
  next: Entry | null
}) {
  return (
    <article
      aria-labelledby="help-article-title"
      className="flex max-w-3xl flex-col gap-8"
    >
      <header id="help-overview" className="flex scroll-mt-20 flex-col gap-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  window.location.hash = ""
                }}
                className={cn("hover:text-foreground", FOCUS_RING)}
              >
                Help
              </a>
            </li>
            <ChevronRight aria-hidden="true" className="size-3.5" />
            <li>{entry.group}</li>
          </ol>
        </nav>
        <h2
          id="help-article-title"
          className="text-3xl font-semibold tracking-tight text-foreground"
        >
          {entry.title}
        </h2>
        <p className="text-base text-muted-foreground">{entry.summary}</p>
      </header>

      {entry.kind === "steps" ? (
        <section
          id="help-steps"
          aria-labelledby="help-steps-title"
          className="scroll-mt-20"
        >
          <h3
            id="help-steps-title"
            className="mb-4 border-b pb-2 text-xl font-semibold text-foreground"
          >
            Steps
          </h3>
          <ol className="flex flex-col">
            {entry.steps.map((step, index) => (
              <li
                key={step}
                className="relative pb-6 pl-10 text-[0.9375rem] leading-relaxed text-foreground before:absolute before:top-8 before:bottom-1 before:left-3 before:w-px before:bg-border last:pb-0 last:before:hidden"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="block pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {entry.kind === "shortcuts" ? (
        <dl className="flex flex-col divide-y divide-border rounded-xl border text-sm">
          {shortcuts.map(({ keys, action }) => (
            <div
              key={action}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
            >
              <dd className="order-first font-medium text-foreground">
                {action}
              </dd>
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
            </div>
          ))}
        </dl>
      ) : null}

      {entry.kind === "contact" ? (
        owners.length > 0 ? (
          <ul className="flex flex-col gap-3 text-sm">
            {owners.map((owner) => (
              <li
                key={owner.email}
                className="flex min-w-0 items-center gap-3 rounded-xl border p-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {initials(owner.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-foreground">
                    {owner.name}
                  </span>
                  {/* 44 px tall on coarse pointers; the inner span truncates. */}
                  <a
                    href={`mailto:${owner.email}`}
                    className={cn(
                      "inline-flex w-fit max-w-full items-center text-primary underline-offset-4 hover:underline focus-visible:rounded-sm pointer-coarse:min-h-11",
                      FOCUS_RING
                    )}
                  >
                    <span className="truncate">{owner.email}</span>
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            There is no active owner yet. Ask whoever set up the site.
          </p>
        )
      ) : null}

      {entry.kind !== "contact" ? (
        <aside
          id="help-more"
          aria-labelledby="help-more-title"
          className="scroll-mt-20 rounded-xl border bg-muted/40 p-4 text-sm"
        >
          <p id="help-more-title" className="font-semibold text-foreground">
            Need more help?
          </p>
          <p className="mt-1 text-muted-foreground">
            Ask an owner, who can invite people, change roles and reset access.{" "}
            <a
              href="#contact"
              className={cn(
                "font-medium text-primary underline-offset-4 hover:underline",
                FOCUS_RING
              )}
            >
              See who to contact
            </a>
          </p>
        </aside>
      ) : null}

      {previous || next ? (
        <nav
          aria-label="Previous and next"
          className="grid gap-3 border-t pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <a
              href={`#${previous.id}`}
              className={cn(
                "group flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-primary/50",
                FOCUS_RING
              )}
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Previous
              </span>
              <span className="text-sm font-semibold text-foreground">
                {previous.title}
              </span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a
              href={`#${next.id}`}
              className={cn(
                "group flex flex-col items-end gap-1 rounded-xl border p-4 text-right transition-colors hover:border-primary/50 sm:col-start-2",
                FOCUS_RING
              )}
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Next
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {next.title}
              </span>
            </a>
          ) : null}
        </nav>
      ) : null}
    </article>
  )
}
