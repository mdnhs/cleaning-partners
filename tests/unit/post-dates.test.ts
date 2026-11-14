import { describe, expect, it } from "vitest"

import {
  DEFAULT_SITE_LOCALE,
  formatDay,
  formatPostDate,
  isoDate,
  siteLocale,
  siteTimeZone,
} from "@/lib/format"

describe("article dates (Europe/Dublin)", () => {
  it.each([
    ["2026-09-20T09:00:00Z", "2026-09-20", "20 Sep 2026"],
    ["2026-08-05T09:00:00Z", "2026-08-05", "05 Aug 2026"],
    ["2026-07-02T09:00:00Z", "2026-07-02", "02 Jul 2026"],
    ["2026-06-04T09:00:00Z", "2026-06-04", "04 Jun 2026"],
    // 23:30 UTC on 31 Mar is already 1 Apr in Irish summer time
    ["2026-03-31T23:30:00Z", "2026-04-01", "01 Apr 2026"],
    // winter: Irish time = UTC
    ["2026-12-31T23:30:00Z", "2026-12-31", "31 Dec 2026"],
  ])("%s → %s, %s", (iso, date, display) => {
    expect(isoDate(new Date(iso))).toBe(date)
    expect(formatPostDate(new Date(iso))).toBe(display)
  })

  it("prints Sep, not Intl's en-IE 'Sept'", () => {
    expect(formatPostDate(new Date("2026-09-12T09:00:00Z"))).toBe("12 Sep 2026")
  })
})

describe("article dates follow settings.site.timezone", () => {
  const lateUtc = new Date("2026-03-31T23:30:00Z")

  it("uses the given IANA zone", () => {
    expect(isoDate(lateUtc, "America/New_York")).toBe("2026-03-31")
    expect(formatPostDate(lateUtc, "America/New_York")).toBe("31 Mar 2026")
    expect(formatPostDate(lateUtc, "Asia/Tokyo")).toBe("01 Apr 2026")
  })

  it("Europe/Dublin output is unchanged (seeded value)", () => {
    expect(formatPostDate(lateUtc, "Europe/Dublin")).toBe(
      formatPostDate(lateUtc)
    )
  })

  it("falls back to Europe/Dublin for a blank or unknown zone", () => {
    expect(siteTimeZone("")).toBe("Europe/Dublin")
    expect(siteTimeZone("Not/AZone")).toBe("Europe/Dublin")
    expect(siteTimeZone(" Asia/Tokyo ")).toBe("Asia/Tokyo")
    expect(formatPostDate(lateUtc, "Not/AZone")).toBe("01 Apr 2026")
  })
})

describe("article dates follow settings.site.locale", () => {
  const sept = new Date("2026-09-12T09:00:00Z")

  it("prints the short month of the site's language", () => {
    expect(formatPostDate(sept, "Europe/Dublin", "en")).toBe("12 Sep 2026")
    expect(formatPostDate(sept, "Europe/Dublin", "fr")).toBe("12 sept. 2026")
  })

  it("falls back to en for an invalid or blank locale, without throwing", () => {
    expect(DEFAULT_SITE_LOCALE).toBe("en")
    expect(siteLocale("english")).toBe("en")
    expect(siteLocale("")).toBe("en")
    expect(siteLocale(null)).toBe("en")
    expect(siteLocale(undefined)).toBe("en")
    expect(siteLocale(" fr ")).toBe("fr")
    expect(formatPostDate(sept, "Europe/Dublin", "english")).toBe("12 Sep 2026")
    expect(formatPostDate(sept, "Europe/Dublin", "")).toBe("12 Sep 2026")
  })

  it("an invalid locale and zone together fall back to en and Europe/Dublin", () => {
    expect(() =>
      formatDay(new Date("2026-03-31T23:30:00Z"), {
        locale: "english",
        timeZone: "Not/AZone",
      })
    ).not.toThrow()
    expect(
      formatDay(new Date("2026-03-31T23:30:00Z"), {
        locale: "english",
        timeZone: "Not/AZone",
      })
    ).toBe("1 Apr 2026")
  })

  it("formatDay keeps day, month, year order and the requested day style", () => {
    expect(
      formatDay(new Date("2026-06-04T09:00:00Z"), { day: "2-digit" })
    ).toBe("04 Jun 2026")
    expect(formatDay(new Date("2026-06-04T09:00:00Z"), {})).toBe("4 Jun 2026")
    // en-US would print "Jun 4, 2026"; the site always reads day first.
    expect(
      formatDay(new Date("2026-06-04T09:00:00Z"), { locale: "en-US" })
    ).toBe("4 Jun 2026")
  })
})
