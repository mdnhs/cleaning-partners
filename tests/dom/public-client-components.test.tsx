import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BlogList, type BlogListProps } from "@/components/blog/blog-list"
import type { PostCardData } from "@/components/blog/post-card"
import { ShareLinks } from "@/components/blog/share-links"
import { QuoteForm, type QuoteFormProps } from "@/components/contact/quote-form"
import { SiteLocale } from "@/components/site-locale"

// The three public client components get every string as a prop (R3-7).

const post = (n: number, category: string): PostCardData => ({
  slug: `post-${n}`,
  href: `/blog/post-${n}`,
  title: `Title ${n}`,
  excerpt: n === 4 ? "mentions the needle" : `Excerpt ${n}`,
  category,
  date: "2026-09-01",
  displayDate: "01 Sep 2026",
  cover: "/c.png",
  readTime: n === 1 ? "5 min read" : null,
})
// Newest first: the first is the featured one.
const posts = [
  post(1, "Alpha"),
  post(2, "Beta"),
  post(3, "Alpha"),
  post(4, "Beta"),
  post(5, "Alpha"),
  post(6, "Beta"),
  post(7, "Alpha"),
  post(8, "Beta"),
]
const blogProps: BlogListProps = {
  posts,
  featured: posts[0],
  categories: ["Alpha", "Beta"],
  pageSize: 6,
  labels: {
    all: "Everything",
    filterAria: "Filter posts",
    searchLabel: "Find posts",
    searchPlaceholder: "Find…",
    featured: "Top story",
    readArticle: "Read on",
    emptyState: "Nothing here.",
    paginationAria: "Pages",
    prevAria: "Back a page",
    prev: "<",
    nextAria: "Forward a page",
    next: ">",
  },
  searchIcon: "/search.svg",
}

const titles = () =>
  screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent)
    .filter(Boolean)

afterEach(() => vi.restoreAllMocks())

describe("BlogList", () => {
  it("shows the featured post above the grid while browsing, then pages the rest", () => {
    render(<BlogList {...blogProps} />)
    expect(screen.getByText("Top story")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Title 1"
    )
    // 7 others, 6 per page.
    expect(titles()).toEqual([2, 3, 4, 5, 6, 7].map((n) => `Title ${n}`))
    expect(screen.getByLabelText("Pages")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "2" }))
    expect(titles()).toEqual(["Title 8"])
    // The featured post sits on page 1 only.
    expect(screen.queryByText("Top story")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Back a page" }))
    expect(screen.getByText("Top story")).toBeInTheDocument()
  })

  it("a category filter drops the featured post and lists every match", () => {
    render(<BlogList {...blogProps} />)
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }))
    expect(screen.queryByText("Top story")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    // The featured article is a match too once filtering.
    expect(titles()).toEqual([1, 3, 5, 7].map((n) => `Title ${n}`))
    fireEvent.click(screen.getByRole("button", { name: "Everything" }))
    expect(screen.getByText("Top story")).toBeInTheDocument()
  })

  it("searches titles and excerpts; no match shows the empty message", () => {
    render(<BlogList {...blogProps} />)
    const search = screen.getByPlaceholderText("Find…")
    fireEvent.change(search, { target: { value: "NEEDLE" } })
    expect(titles()).toEqual(["Title 4"])
    fireEvent.change(search, { target: { value: "zzz" } })
    expect(screen.getByText("Nothing here.")).toBeInTheDocument()
  })

  it("starts from ?category and ?q, ignoring an unknown category", () => {
    const { unmount } = render(
      <BlogList {...blogProps} initialCategory="Beta" initialQuery="title 6" />
    )
    expect(titles()).toEqual(["Title 6"])
    unmount()
    render(<BlogList {...blogProps} initialCategory="Gamma" />)
    expect(screen.getByRole("button", { name: "Everything" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  it("renders the pagination arrows and labels it was given", () => {
    render(<BlogList {...blogProps} />)
    const nav = screen.getByRole("navigation", { name: "Pages" })
    expect(
      within(nav).getByRole("button", { name: "Back a page" })
    ).toBeDisabled()
    expect(
      within(nav).getByRole("button", { name: "Forward a page" })
    ).toHaveTextContent(">")
    expect(screen.getAllByText("Read on").length).toBeGreaterThan(1)
    expect(screen.getByText(/5 min read/)).toBeInTheDocument()
  })
})

describe("ShareLinks", () => {
  it("opens each network's address with the page address filled in, encoded", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null)
    render(
      <ShareLinks
        label="Pass it on:"
        aria="Share on {network}"
        title="A title"
        networks={[
          { label: "f", name: "Face", url: "https://f.example/s?u={url}" },
          {
            label: "x",
            name: "Ex",
            url: "https://x.example/p?t={title}&u={url}",
          },
        ]}
      />
    )
    expect(screen.getByText("Pass it on:")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Share on Face" }))
    expect(open).toHaveBeenLastCalledWith(
      `https://f.example/s?u=${encodeURIComponent(window.location.href)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=540"
    )
    fireEvent.click(screen.getByRole("button", { name: "Share on Ex" }))
    expect(open.mock.calls.at(-1)?.[0]).toBe(
      `https://x.example/p?t=A%20title&u=${encodeURIComponent(window.location.href)}`
    )
  })
})

describe("QuoteForm", () => {
  const field = (label: string) => ({ label, placeholder: `${label}…` })
  const props: QuoteFormProps = {
    eyebrow: "EYE",
    title: "Ask",
    intro: "Intro",
    stepsHeading: "Next",
    steps: [{ title: "One", description: "First" }],
    urgent: { title: "Now?", phone: "Ring 1", phoneHref: "tel:+1" },
    formTitle: "Details",
    fields: {
      name: field("Your name"),
      phone: field("Your phone"),
      email: field("Your email"),
      service: {
        ...field("Which"),
        options: ["Medical", "Other"],
        fallback: "Dunno",
      },
      address: field("Where"),
      message: field("Tell us"),
      consent: { label: "OK to call" },
    },
    chevron: "/chevron.svg",
    submitLabel: "Go",
    email: "hello@example.ie",
    mailSubject: "Quote from {name}",
    sentMessage: "Check your mail, or write to {email}.",
  }

  it("renders its copy, the service options and the data-driven urgent line", () => {
    render(<QuoteForm {...props} />)
    expect(screen.getByRole("heading", { name: "Ask" })).toBeInTheDocument()
    expect(screen.getByText("Ring 1")).toHaveAttribute("href", "tel:+1")
    const select = screen.getByLabelText("Which")
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["Which…", "Medical", "Other"])
    expect(screen.getByPlaceholderText("Where…")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument()
  })
})

describe("QuoteForm submit", () => {
  it("hands the enquiry to the mail app with labels, subject and fallback from props", () => {
    // Setting href records the mailto: address; reading it still resolves
    // relative image paths (as the page URL would, before the navigation).
    let mailto = ""
    const location = {
      get href() {
        return "http://localhost/"
      },
      set href(value: string) {
        mailto = value
      },
    }
    vi.stubGlobal("location", location)
    const field = (label: string) => ({ label, placeholder: label })
    render(
      <QuoteForm
        eyebrow="E"
        title="T"
        intro="I"
        stepsHeading="S"
        steps={[]}
        urgent={{ title: "U", phone: "P", phoneHref: "tel:+1" }}
        formTitle="F"
        fields={{
          name: field("Your name"),
          phone: field("Your phone"),
          email: field("Your email"),
          service: { ...field("Which"), options: ["A"], fallback: "Dunno" },
          address: field("Where"),
          message: field("Tell us"),
          consent: { label: "OK" },
        }}
        chevron="/c.svg"
        submitLabel="Go"
        email="hello@example.ie"
        mailSubject="Quote from {name}"
        sentMessage="Mail sent to {email}."
      />
    )
    fireEvent.change(screen.getByLabelText(/Your name/), {
      target: { value: "Ann" },
    })
    fireEvent.change(screen.getByLabelText(/Your phone/), {
      target: { value: "01" },
    })
    fireEvent.change(screen.getByLabelText(/Your email/), {
      target: { value: "a@b.ie" },
    })
    fireEvent.click(screen.getByLabelText("OK"))
    fireEvent.submit(screen.getByRole("button", { name: "Go" }))
    const url = new URL(mailto)
    expect(url.protocol).toBe("mailto:")
    expect(url.pathname).toBe("hello@example.ie")
    expect(url.searchParams.get("subject")).toBe("Quote from Ann")
    expect(url.searchParams.get("body")).toBe(
      [
        "Your name: Ann",
        "Your phone: 01",
        "Your email: a@b.ie",
        "Which: Dunno",
        "Where: ",
        "",
        "",
      ].join("\n")
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mail sent to hello@example.ie."
    )
  })
})

describe("SiteLocale", () => {
  it("applies the locale to <html lang> after hydration", () => {
    render(<SiteLocale lang="en-IE" />)
    expect(document.documentElement.lang).toBe("en-IE")
    document.documentElement.lang = ""
  })
})
