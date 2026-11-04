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
