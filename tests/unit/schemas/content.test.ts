import { describe, expect, it } from "vitest"

import { articleSchema } from "@/lib/schemas/content/article"
import { categorySchema } from "@/lib/schemas/content/category"
import { clientSchema } from "@/lib/schemas/content/client"
import { groupCompanySchema } from "@/lib/schemas/content/group-company"
import { serviceSchema } from "@/lib/schemas/content/service"
import { teamMemberSchema } from "@/lib/schemas/content/team-member"

import { schemaPaths } from "../helpers/schema-paths"

const media = { mediaId: "0199a0b2-4c1d-7e3f-8a5b-0123456789ab" }

describe("clientSchema.url", () => {
  const client = { name: "HSE", logo: media, url: null as string | null }

  it.each([null, "https://www.hse.ie"])("accepts %j", (url) => {
    expect(clientSchema.safeParse({ ...client, url }).success).toBe(true)
  })

  it.each(["javascript:alert(1)", "data:text/html,x"])("rejects %j", (url) => {
    expect(clientSchema.safeParse({ ...client, url }).success).toBe(false)
  })
})

describe("serviceSchema (R3-3: CP shape from lib/services.ts)", () => {
  const service = {
    slug: "medical-cleaning",
    title: "Medical Cleaning",
    icon: media,
    cover: media,
    summary: "We understand the importance of the high standard of cleaning.",
    tags: ["Daily cleaning", "Deep cleaning"],
    heroDescription: "Hygienic, high-standard cleaning for hospitals.",
    overviewTitle: "Cleaning to Healthcare Standards",
    overview: ["First paragraph.", "Second paragraph."],
    included: ["Daily cleaning of clinical and public areas"],
    places: ["Hospitals", "GP clinics"],
  }

  it("has exactly the CP fields", () => {
    expect(Object.keys(serviceSchema.shape).sort()).toEqual(
      [
        "slug",
        "title",
        "icon",
        "cover",
        "summary",
        "tags",
        "heroDescription",
        "overviewTitle",
        "overview",
        "included",
        "places",
      ].sort()
    )
    const paths = schemaPaths(serviceSchema)
    for (const list of ["tags", "overview", "included", "places"])
      expect(paths.lists.has(list), list).toBe(true)
  })

  it("round-trips a service unchanged", () => {
    expect(serviceSchema.parse(service)).toEqual(service)
  })

  it("needs a unique-shaped slug, at least one paragraph and included item", () => {
    expect(
      serviceSchema.safeParse({ ...service, slug: "Medical" }).success
    ).toBe(false)
    expect(serviceSchema.safeParse({ ...service, overview: [] }).success).toBe(
      false
    )
    expect(serviceSchema.safeParse({ ...service, included: [] }).success).toBe(
      false
    )
  })

  it("allows no tags or places", () => {
    expect(
      serviceSchema.safeParse({ ...service, tags: [], places: [] }).success
    ).toBe(true)
  })
})

describe("categorySchema", () => {
  it("round-trips a category with its filter flag", () => {
    const category = {
      slug: "ulv-fogging",
      name: "ULV Fogging",
      showInFilter: true,
    }
    expect(categorySchema.parse(category)).toEqual(category)
    expect(
      categorySchema.safeParse({ ...category, showInFilter: undefined }).success
    ).toBe(false)
  })
})

describe("groupCompanySchema", () => {
  const company = {
    name: "MJS Eco",
    phone: "Tel: 087 294 8880",
    site: "www.mjseco.ie",
    logo: media,
  }

  it("round-trips a group company", () => {
    expect(groupCompanySchema.parse(company)).toEqual(company)
  })

  it.each(["https://www.mjseco.ie", "mjseco", "javascript:alert(1)"])(
    "rejects %j as the site (domain only)",
    (site) => {
      expect(groupCompanySchema.safeParse({ ...company, site }).success).toBe(
        false
      )
    }
  )
})

describe("teamMemberSchema (CP members have no email)", () => {
  const member = {
    name: "Michael McDonald",
    role: "MANAGING DIRECTOR",
    bio: "Michael saw the opportunity to provide a one stop shop.",
    photo: media,
  }

  it("round-trips a member", () => {
    expect(teamMemberSchema.parse(member)).toEqual(member)
    expect(teamMemberSchema.parse({ ...member, photo: null }).photo).toBeNull()
  })

  it("has no email field", () => {
    expect(Object.keys(teamMemberSchema.shape)).not.toContain("email")
  })
})

describe("articleSchema", () => {
  it("keeps SP's shape: payload plus slug and relations", () => {
    expect(Object.keys(articleSchema.shape).sort()).toEqual(
      [
        "title",
        "excerpt",
        "cover",
        "lead",
        "tags",
        "body",
        "slug",
        "categoryId",
        "authorId",
      ].sort()
    )
  })

  it("accepts a bodiless article (the six without a designed body)", () => {
    expect(
      articleSchema.safeParse({
        slug: "deep-cleaning-vs-regular-cleaning-what-your-business-needs",
        title: "Deep Cleaning vs Regular Cleaning: What Your Business Needs",
        excerpt: "Daily and weekly cleaning keeps things tidy.",
        cover: media,
        lead: null,
        tags: [],
        body: null,
        categoryId: "0199a0b2-4c1d-7e3f-8a5b-0123456789ac",
        authorId: null,
      }).success
    ).toBe(true)
  })
})
