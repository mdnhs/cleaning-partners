import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Contact, type ContactProps } from "@/components/home/contact"

const phone: ContactProps["cards"][number] = {
  kind: "phone",
  title: "Phone",
  icon: "/images/home/phone.svg",
  lines: ["Tel: 057 8697670 Ext 4"],
  href: "tel:+353578697670",
}
const email: ContactProps["cards"][number] = {
  kind: "email",
  title: "Email",
  icon: "/images/home/mail.svg",
  lines: ["hello@example.ie"],
  href: "mailto:hello@example.ie",
}
const address: ContactProps["cards"][number] = {
  kind: "address",
  title: "Location",
  icon: "/images/home/pin.svg",
  lines: ["1 Main St,", "Tullamore"],
  href: "https://www.google.com/maps/search/?api=1&query=1%20Main%20St",
}
const hours: ContactProps["cards"][number] = {
  kind: "hours",
  title: "Office Hours",
  icon: "/images/home/clock.svg",
  lines: ["Mon–Fri 9–5"],
  href: null,
}

const props = (cards: ContactProps["cards"]): ContactProps => ({
  eyebrow: "Contact",
  title: "Contact Us",
  labels: {
    callLabel: "Call",
    emailLabel: "Email",
    directionsLabel: "Directions",
    mapLabel: "Map",
    followLabel: "Follow us",
  },
  cards,
  member: { logo: "/logo.png", logoAlt: "ICCA", title: "M", subtitle: "S" },
  socials: [],
  quote: { title: "Q", body: "B", cta: { label: "Quote", href: "/quote" } },
})

/** The phone layout's three quick-action links (first list in the section). */
const quickActions = () => within(screen.getAllByRole("list")[0])

/** The phone layout's row for a card (its title's list item). */
function row(title: string) {
  const heading = screen
    .getAllByRole("heading", { level: 3, name: title })
    .find((h) => h.closest("li")?.className.includes("border-b"))!
  return within(heading.closest("li")!)
}

describe("Contact", () => {
  it("chooses the quick actions and row pills by card kind, not position", () => {
    render(<Contact {...props([address, hours, email, phone])} />)

    const actions = quickActions()
    expect(
      actions.getByRole("link", { name: "Call" }).getAttribute("href")
    ).toBe(phone.href)
    expect(
      actions.getByRole("link", { name: "Email" }).getAttribute("href")
    ).toBe(email.href)
    expect(
      actions.getByRole("link", { name: "Directions" }).getAttribute("href")
    ).toBe(address.href)

    expect(row("Phone").getByRole("link", { name: "Call" })).toBeDefined()
    expect(
      row("Phone").getByRole("link", { name: "Call" }).getAttribute("href")
    ).toBe(phone.href)
    expect(
      row("Email").getByRole("link", { name: "Email" }).getAttribute("href")
    ).toBe(email.href)
    expect(
      row("Location").getByRole("link", { name: "Map" }).getAttribute("href")
    ).toBe(address.href)
    expect(row("Office Hours").queryByRole("link")).toBeNull()
  })

  it("uses the first phone card when there are two", () => {
    const second = {
      ...phone,
      title: "Mobile",
      lines: ["085 806 2369"],
      href: "tel:+353858062369",
    }
    render(<Contact {...props([phone, second, email, address])} />)
    expect(
      quickActions().getByRole("link", { name: "Call" }).getAttribute("href")
    ).toBe(phone.href)
  })
})
