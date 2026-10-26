import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BlogList, type BlogListProps } from "@/components/blog/blog-list"
import type { PostCardData } from "@/components/blog/post-card"
import { ShareLinks } from "@/components/blog/share-links"
import { buttonVariants } from "@/components/ui/button"
import { QuoteForm, type QuoteFormProps } from "@/components/contact/quote-form"
import { Team, type TeamProps } from "@/components/home/team"
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
  const field = (label: string) => ({
    label,
    placeholder: `${label}…`,
    error: `${label} error copy`,
  })
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
      },
      address: field("Where"),
      message: field("Tell us"),
      consent: { label: "OK to call", error: "Consent error copy" },
    },
    chevron: "/chevron.svg",
    submitLabel: "Go",
    email: "hello@example.ie",
    sentMessage: "Check your mail, or write to {email}.",
    sendingLabel: "Sending now",
    errorMessage: "It failed",
    rateLimitedMessage: "Slow down",
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

describe("QuoteForm submit (R7-4)", () => {
  const field = (label: string) => ({
    label,
    placeholder: label,
    error: `${label} error copy`,
  })
  const props: QuoteFormProps = {
    eyebrow: "E",
    title: "T",
    intro: "I",
    stepsHeading: "S",
    steps: [],
    urgent: { title: "U", phone: "P", phoneHref: "tel:+1" },
    formTitle: "F",
    fields: {
      name: field("Your name"),
      phone: field("Your phone"),
      email: field("Your email"),
      service: { ...field("Which"), options: ["A", "B"] },
      address: field("Where"),
      message: field("Tell us"),
      consent: { label: "OK", error: "Consent error copy" },
    },
    chevron: "/c.svg",
    submitLabel: "Go",
    email: "hello@example.ie",
    sentMessage: "Sent, or write to {email}.",
    sendingLabel: "Sending now",
    errorMessage: "It failed",
    rateLimitedMessage: "Slow down",
  }
  const CONFIG = "/api/v1/public/leads/config"
  const ENDPOINT = "/api/v1/public/leads"

  type Reply = () => Promise<Response>
  let leadReply: Reply
  let siteKey: string | null
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(async (url) =>
    url === CONFIG
      ? new Response(JSON.stringify({ turnstileSiteKey: siteKey }))
      : leadReply()
  )
  const json =
    (body: unknown, status = 200): Reply =>
    async () =>
      new Response(JSON.stringify(body), { status })
  const posts = () => fetchMock.mock.calls.filter(([url]) => url === ENDPOINT)

  beforeEach(() => {
    siteKey = null
    leadReply = json({ ok: true })
    fetchMock.mockClear()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => {
    delete window.turnstile
    delete (window as { __cpConsent?: unknown }).__cpConsent
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  async function fillAndSend(service = "B") {
    const user = userEvent.setup()
    for (const [label, value] of [
      [/Your name/, "Ann"],
      [/Your phone/, "01 234"],
      [/Your email/, "a@b.ie"],
      [/Where/, "1 Main St"],
      [/Tell us/, "Hello"],
    ] as const) {
      await user.clear(screen.getByLabelText(label))
      await user.type(screen.getByLabelText(label), value)
    }
    await user.selectOptions(screen.getByLabelText("Which"), service)
    const consent = screen.getByLabelText("OK")
    if (!(consent as HTMLInputElement).checked) await user.click(consent)
    await user.click(screen.getByRole("button", { name: /Go|Sending now/ }))
    return user
  }

  it("posts all seven fields, consent true, sourcePage and website as JSON", async () => {
    render(<QuoteForm {...props} />)
    await fillAndSend()
    expect(
      await screen.findByText("Sent, or write to hello@example.ie.")
    ).toBeInTheDocument()
    const [, init] = posts()[0]
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ "content-type": "application/json" })
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Ann",
      phone: "01 234",
      email: "a@b.ie",
      service: "B",
      address: "1 Main St",
      message: "Hello",
      consent: true,
      sourcePage: "/",
      website: "",
    })
    // The form is reset and the button is usable again.
    expect(screen.getByLabelText(/Your name/)).toHaveValue("")
    expect(screen.getByLabelText("OK")).not.toBeChecked()
    expect(screen.getByLabelText("Which")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Go" })).toBeEnabled()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sent, or write to hello@example.ie."
    )
  })

  it("never navigates to mailto:", async () => {
    const location = {
      href: "http://localhost/",
      pathname: "/",
      assign: vi.fn(),
      replace: vi.fn(),
    }
    const setHref = vi.fn()
    Object.defineProperty(location, "href", {
      get: () => "http://localhost/",
      set: setHref,
    })
    vi.stubGlobal("location", location)
    render(<QuoteForm {...props} />)
    await fillAndSend()
    await screen.findByText(/Sent/)
    expect(setHref).not.toHaveBeenCalled()
    expect(location.assign).not.toHaveBeenCalled()
  })

  it("shows the sending label while in flight and sends a double submit once", async () => {
    let release!: (r: Response) => void
    leadReply = () => new Promise<Response>((resolve) => (release = resolve))
    const { container } = render(<QuoteForm {...props} />)
    const user = await fillAndSend()
    const button = await screen.findByRole("button", { name: "Sending now" })
    expect(button).toBeDisabled()
    await user.click(button)
    await act(async () => {
      const form = container.querySelector("form")!
      form.requestSubmit()
      form.requestSubmit()
    })
    release(new Response(JSON.stringify({ ok: true })))
    await screen.findByText(/Sent/)
    expect(posts()).toHaveLength(1)
  })

  it.each([
    ["429", json({ error: { code: "RATE_LIMITED" } }, 429), "Slow down"],
    ["500", json({}, 500), "It failed"],
    [
      "network failure",
      async () => {
        throw new TypeError("Failed to fetch")
      },
      "It failed",
    ],
  ] as [string, Reply, string][])(
    "%s shows the matching copy and keeps the fields",
    async (_, reply, text) => {
      leadReply = reply
      render(<QuoteForm {...props} />)
      await fillAndSend()
      expect(await screen.findByRole("status")).toHaveTextContent(text)
      expect(screen.getByLabelText(/Your name/)).toHaveValue("Ann")
      expect(screen.getByRole("button", { name: "Go" })).toBeEnabled()
    }
  )

  it("422 shows the template copy next to each field, never the server text, and focuses the first invalid field", async () => {
    render(<QuoteForm {...props} />)
    expect(document.querySelectorAll('[id$="-error"]')).toHaveLength(0)
    leadReply = json(
      {
        error: {
          code: "VALIDATION_FAILED",
          fieldErrors: {
            service: ["SERVER-SERVICE-TEXT"],
            phone: ["SERVER-PHONE-TEXT"],
            consent: ["SERVER-CONSENT-TEXT"],
            sourcePage: ["SERVER-IGNORED-TEXT"],
          },
        },
      },
      422
    )
    await fillAndSend()
    expect(await screen.findByText("Which error copy")).toBe(
      document.getElementById("quote-service-error")
    )
    expect(screen.getByText("Your phone error copy")).toBe(
      document.getElementById("quote-phone-error")
    )
    expect(screen.getByText("Consent error copy")).toBe(
      document.getElementById("quote-consent-error")
    )
    expect(document.body.textContent).not.toMatch(/SERVER-/)
    for (const [el, id] of [
      [screen.getByLabelText("Which"), "quote-service-error"],
      [screen.getByLabelText(/Your phone/), "quote-phone-error"],
      [screen.getByLabelText("OK"), "quote-consent-error"],
    ] as const) {
      expect(el).toHaveAttribute("aria-invalid", "true")
      expect(el).toHaveAttribute("aria-describedby", id)
    }
    expect(screen.getByLabelText(/Your name/)).not.toHaveAttribute(
      "aria-invalid"
    )
    expect(document.getElementById("quote-service-error")!.parentElement).toBe(
      screen.getByLabelText("Which").closest("div")!.parentElement
    )
    // Document order: phone precedes service.
    expect(screen.getByLabelText(/Your phone/)).toHaveFocus()
    expect(screen.getByRole("status")).toHaveTextContent("It failed")
    // The next attempt clears them.
    leadReply = json({ ok: true })
    await fillAndSend()
    await screen.findByText(/Sent/)
    expect(document.querySelectorAll('[id$="-error"]')).toHaveLength(0)
  })

  it("tracks lead_submitted once on success, never on failure, without personal data", async () => {
    const win = window as unknown as {
      __cpConsent?: unknown
      dataLayer?: Record<string, unknown>[]
    }
    win.__cpConsent = { analytics: true, marketing: false }
    win.dataLayer = []
    render(<QuoteForm {...props} />)
    leadReply = json({}, 500)
    await fillAndSend()
    await screen.findByText("It failed")
    expect(win.dataLayer).toEqual([])
    leadReply = json({ ok: true })
    await fillAndSend()
    await screen.findByText(/Sent/)
    const events = win.dataLayer!.filter((e) => e.event === "lead_submitted")
    expect(events).toEqual([{ event: "lead_submitted", source_page: "/" }])
    const dump = JSON.stringify(win.dataLayer)
    for (const pii of ["Ann", "a@b.ie", "01 234", "Hello", "1 Main St"])
      expect(dump).not.toContain(pii)
    delete win.dataLayer
  })

  it("sends the Turnstile token and resets the widget after the send", async () => {
    siteKey = "0x4AAAAAAAtestsitekey"
    let options: { callback(token: string): void } | undefined
    const api = {
      render: vi.fn((_el: HTMLElement, o: typeof options) => {
        options = o
        return "w1"
      }),
      execute: vi.fn(() => options?.callback("tok-1")),
      reset: vi.fn(),
      remove: vi.fn(),
    }
    window.turnstile = api as never
    render(<QuoteForm {...props} />)
    await fillAndSend()
    await screen.findByText(/Sent/)
    expect(JSON.parse(String(posts()[0][1]?.body)).turnstileToken).toBe("tok-1")
    await waitFor(() => expect(api.reset).toHaveBeenCalledWith("w1"))
  })

  it("sends attribution only with analytics consent", async () => {
    const attribution = {
      referrer: "https://www.google.com/search",
      landingPath: "/services",
      utm: { utm_source: "google" },
      capturedAt: "2026-10-20T09:30:00.000Z",
    }
    window.sessionStorage.setItem("cp_attribution", JSON.stringify(attribution))
    const win = window as { __cpConsent?: unknown }
    render(<QuoteForm {...props} />)
    await fillAndSend()
    await screen.findByText(/Sent/)
    expect(JSON.parse(String(posts()[0][1]?.body))).not.toHaveProperty(
      "attribution"
    )
    win.__cpConsent = { analytics: true, marketing: false }
    await fillAndSend()
    await waitFor(() => expect(posts()).toHaveLength(2))
    expect(JSON.parse(String(posts()[1][1]?.body)).attribution).toEqual(
      attribution
    )
  })

  it("keeps the in-flow children of the form as they were; additions are absolutely positioned", () => {
    const { container } = render(<QuoteForm {...props} />)
    const form = container.querySelector("form")!
    expect(form.className).not.toContain("relative")
    const inFlow = [...form.children].filter(
      (el) => !el.className.split(" ").includes("absolute")
    )
    expect(inFlow.map((el) => [el.tagName, el.className])).toEqual([
      ["H3", "font-heading text-[28px]/[normal] font-bold text-ink"],
      ["DIV", "grid gap-x-4 gap-y-5 sm:grid-cols-2"],
      ["DIV", "flex flex-col gap-2"],
      ["DIV", "flex flex-col gap-2"],
      [
        "LABEL",
        "flex cursor-pointer items-center gap-3 text-[15px]/[normal] text-body",
      ],
      [
        "BUTTON",
        buttonVariants({
          variant: "brand",
          size: "pill",
          className: "w-full",
        }),
      ],
      ["P", "text-center text-[15px] text-body sr-only"],
    ])
    const abs = [...form.children].filter((el) =>
      el.className.split(" ").includes("absolute")
    )
    expect(abs).toHaveLength(2)
    const honeypot = form.querySelector<HTMLInputElement>(
      'input[name="website"]'
    )!
    expect(honeypot.tabIndex).toBe(-1)
    expect(honeypot.autocomplete).toBe("off")
    expect(honeypot.closest("div")).toHaveAttribute("aria-hidden", "true")
    expect(honeypot.closest("label")).toBeNull()
    expect(honeypot.closest("div")!.querySelector("label")).toBeNull()
    expect(screen.getByRole("status").className).toContain("sr-only")
    expect(screen.getByRole("status")).toHaveTextContent("")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("SiteLocale", () => {
  it("applies the locale to <html lang> after hydration", () => {
    render(<SiteLocale lang="en-IE" />)
    expect(document.documentElement.lang).toBe("en-IE")
    document.documentElement.lang = ""
  })
})

describe("Team photo layouts", () => {
  const props = (photo: TeamProps["members"][number]["photo"]): TeamProps => ({
    background: "/bg.png",
    eyebrow: "E",
    title: "T",
    description: "D",
    members: [{ name: "Ann", role: "R", bio: "B", photo }],
  })

  it("draws the shared placeholder with the design's crop", () => {
    render(<Team {...props({ src: "/team-temp.png", placeholder: true })} />)
    const img = screen.getByAltText("Ann")
    expect(img.className).toContain("h-[186.13%]")
    expect(img.className).not.toContain("object-cover")
    expect(img).toHaveAttribute("width", "720")
    expect(img).toHaveAttribute("height", "1047")
  })

  it("fills the box with a real headshot", () => {
    render(<Team {...props({ src: "/ann.jpg", placeholder: false })} />)
    const img = screen.getByAltText("Ann")
    expect(img.className).toContain("object-cover")
    expect(img.className).not.toContain("h-[186.13%]")
    expect(img).toHaveAttribute("data-nimg", "fill")
  })

  it("renders no image without a photo", () => {
    render(<Team {...props(null)} />)
    expect(screen.queryByAltText("Ann")).toBeNull()
  })
})
