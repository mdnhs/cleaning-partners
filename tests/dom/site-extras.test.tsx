import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PublicMarketing } from "@/server/modules/marketing/public"
import { trackingIds } from "@/lib/analytics/loaders"
import { fixtureMediaLookup } from "@/server/db/seed/fixtures/media"
import { settingsFixture } from "@/server/db/seed/fixtures/settings"
import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"

const mocks = vi.hoisted(() => ({
  marketing: undefined as unknown,
  sources: undefined as unknown,
}))

vi.mock("next/server", () => ({ connection: async () => {} }))
vi.mock("@/server/lib/site-origin", () => ({
  publicOrigin: () => "https://example.test",
}))
vi.mock("@/server/modules/marketing/public", () => ({
  loadPublicMarketing: async () => mocks.marketing,
}))
vi.mock("@/server/modules/pages/sources", () => ({
  loadSiteSources: async () => mocks.sources,
}))

import { SiteExtras } from "@/components/site-extras"

const seed = settingsFixture(fixtureMediaLookup)

function marketing(
  over: Partial<PublicMarketing["tracking"]>
): PublicMarketing {
  const tracking = { ...seed.tracking, ...over }
  return {
    tracking,
    ids: trackingIds(tracking),
    consent: seed.consent,
    customCode: seed.customCode,
  }
}

async function renderExtras() {
  const ui = await SiteExtras()
  return render(<>{ui}</>)
}

beforeEach(() => {
  mocks.sources = fixtureSiteSources()
  document.cookie = "cp_consent=; Max-Age=0; Path=/"
})
afterEach(cleanup)

describe("SiteExtras (R8-12: tracking off by default)", () => {
  it("the seeded value renders only the JSON-LD", async () => {
    mocks.marketing = marketing({})
    const { container } = await renderExtras()
    expect(container.querySelectorAll("script")).toHaveLength(1)
    expect(
      container.querySelector("script[type='application/ld+json']")
    ).not.toBeNull()
    expect(container.querySelector("[data-consent-banner]")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("published enabled:false with a channel on and an ID gives no banner and no tracker script", async () => {
    mocks.marketing = marketing({
      enabled: false,
      gtmEnabled: true,
      gtmId: "GTM-ABC123",
    })
    expect((mocks.marketing as PublicMarketing).ids.gtmId).toBe("GTM-ABC123")
    const { container } = await renderExtras()
    expect(container.querySelector("[data-consent-banner]")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    expect(container.innerHTML).not.toMatch(/googletagmanager|GTM-ABC123/)
    expect(container.querySelectorAll("script")).toHaveLength(1)
  })

  it("tracking on shows the banner from settings.consent, as text", async () => {
    mocks.marketing = {
      ...marketing({ enabled: true }),
      consent: {
        ...seed.consent,
        title: "<img src=x onerror=alert(1)> Title",
        body: "<b>bold</b> body",
      },
    }
    const { container } = await renderExtras()
    // The provider reads the cookie after mount; wait for the banner.
    await waitFor(() =>
      expect(container.querySelector("[data-consent-banner]")).not.toBeNull()
    )
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("b")).toBeNull()
    expect(container.textContent).toContain(
      "<img src=x onerror=alert(1)> Title"
    )
    expect(container.textContent).toContain("<b>bold</b> body")
  })
})
