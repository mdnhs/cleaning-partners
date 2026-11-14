import { describe, expect, it } from "vitest"

import { fixtureSiteSources } from "@/server/db/seed/fixtures/sources"
import { homeView } from "@/templates/home/view"

describe("home hero view: the background video", () => {
  it("has no backgroundVideo key without a video (the props stay as they were)", () => {
    const { hero } = homeView(fixtureSiteSources())
    expect(Object.keys(hero)).not.toContain("backgroundVideo")
  })

  it("passes the video's URL on when one is set", () => {
    const s = fixtureSiteSources()
    const withVideo = {
      ...s,
      pages: {
        ...s.pages,
        home: {
          ...s.pages.home,
          data: {
            ...s.pages.home.data,
            hero: {
              ...s.pages.home.data.hero,
              backgroundVideo: {
                ...s.pages.home.data.hero.background,
                url: "/api/v1/media/file/2026/11/loop.mp4",
              },
            },
          },
        },
      },
    }
    expect(homeView(withVideo).hero.backgroundVideo).toBe(
      "/api/v1/media/file/2026/11/loop.mp4"
    )
  })
})

describe("home hero view: the membership badge", () => {
  it("takes the logo and its description from Settings › Site › Membership", () => {
    const s = fixtureSiteSources()
    const membership = {
      logo: {
        ...s.settings.site.logoLarge,
        url: "/api/v1/media/file/badge.png",
      },
      logoAlt: "Badge description",
      name: "Badge Association",
    }
    const sources = {
      ...s,
      settings: { ...s.settings, site: { ...s.settings.site, membership } },
    }
    const { member } = homeView(sources).hero
    expect(member.logo).toBe(membership.logo.url)
    expect(member.logoAlt).toBe(membership.logoAlt)
    expect(member.label).toBe(s.pages.home.data.hero.memberLabel)
  })
})
