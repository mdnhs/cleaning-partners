import type { ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * MK parity B3 (settings pins): the Settings section index and the
 * [key] page, rendered as server components with the session and
 * navigation mocked. Other panel pages are pinned by the task that ships
 * them (marketing/AI/integrations 7-9).
 */
const nav = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
  forbidden: vi.fn(() => {
    throw new Error("FORBIDDEN")
  }),
}))
vi.mock("next/navigation", () => nav)

const session = vi.hoisted(() => ({
  roles: ["owner"] as string[],
  requirePermission: vi.fn(),
  requirePage: vi.fn(),
}))
vi.mock("@/server/auth/session", () => ({
  requirePermission: session.requirePermission,
  requirePage: session.requirePage,
}))

vi.mock("@/components/admin/media/library", () => ({
  MediaLibrary: () => null,
}))
vi.mock("@/components/admin/articles/articles-screen", () => ({
  ArticlesScreen: () => null,
}))
vi.mock("@/components/admin/articles/new-article-form", () => ({
  NewArticleForm: () => null,
}))
vi.mock("@/server/modules/seo/queries", () => ({
  getSiteOrigin: async () => "https://example.ie",
}))
vi.mock("@/components/admin/articles/article-editor", () => ({
  ArticleEditor: () => null,
}))
vi.mock("@/components/admin/collections/collection-screen", () => ({
  CollectionScreen: () => null,
}))
vi.mock("@/components/admin/settings/settings-editor", () => ({
  SettingsEditor: () => null,
}))
vi.mock("@/components/admin/ai/ai-settings-view", () => ({
  AiSettingsView: () => null,
}))
vi.mock("@/components/admin/integrations/integration-form", () => ({
  IntegrationForm: () => null,
}))
vi.mock("@/components/admin/integrations/migrate-media-panel", () => ({
  MigrateMediaPanel: () => null,
}))

import BlogCategoriesPage from "@/app/(admin)/admin/(panel)/blog/categories/page"
import ArticlePage from "@/app/(admin)/admin/(panel)/blog/[id]/page"
import BlogPage from "@/app/(admin)/admin/(panel)/blog/page"
import NewArticlePage from "@/app/(admin)/admin/(panel)/blog/new/page"
import AiAssistantPage from "@/app/(admin)/admin/(panel)/settings/ai-assistant/page"
import IntegrationPage from "@/app/(admin)/admin/(panel)/settings/integrations/[slug]/page"
import ActivityPage from "@/app/(admin)/admin/(panel)/activity/page"
import CollectionsPage from "@/app/(admin)/admin/(panel)/collections/page"
import MediaPage from "@/app/(admin)/admin/(panel)/media/page"
import UserPage from "@/app/(admin)/admin/(panel)/users/[id]/page"
import UsersPage from "@/app/(admin)/admin/(panel)/users/page"
import SettingsKeyPage from "@/app/(admin)/admin/(panel)/settings/[key]/page"
import SettingsPage from "@/app/(admin)/admin/(panel)/settings/page"
import { AiSettingsView } from "@/components/admin/ai/ai-settings-view"
import { SettingsEditor } from "@/components/admin/settings/settings-editor"
import { permissionFor } from "@/lib/admin/nav"
import {
  EDITABLE_SETTINGS_KEYS,
  SETTINGS_ENTRIES,
} from "@/lib/admin/settings-keys"
import { hasPermission, type PermissionRequest } from "@/lib/auth/permissions"

beforeEach(() => {
  vi.clearAllMocks()
  session.roles = ["owner"]
  session.requirePermission.mockImplementation(
    async (req: PermissionRequest) => {
      if (!hasPermission(session.roles, req)) nav.forbidden()
      return { roles: session.roles }
    }
  )
  // A copy of requirePage (server/auth/session.ts) over the mocked
  // requirePermission. Keep the two in step: the real one loads the
  // database and Better Auth.
  session.requirePage.mockImplementation(async (href: string) => {
    const permission = permissionFor(href)
    if (permission === undefined) nav.notFound()
    if (permission === null) return { roles: session.roles }
    return session.requirePermission(permission)
  })
})

type Props = Record<string, unknown>
/** The page's Suspense child, rendered (the async server component). */
async function inner(page: ReactElement): Promise<ReactElement | null> {
  const child = (page.props as { children: ReactElement }).children
  const render = child.type as (props: Props) => Promise<ReactElement | null>
  return render(child.props as Props)
}
const params = <T,>(value: T) => Promise.resolve(value)

describe("/admin/settings opens its first readable child (registry)", () => {
  it("→ /admin/settings/site for a settings reader", async () => {
    session.roles = ["viewer"]
    await expect(inner(SettingsPage())).rejects.toThrow(
      "REDIRECT /admin/settings/site"
    )
  })

  it("is forbidden without settings:read", async () => {
    session.roles = ["author"]
    await expect(inner(SettingsPage())).rejects.toThrow("FORBIDDEN")
  })
})

describe("/admin/collections opens its first readable child (registry)", () => {
  it("→ Team for collection readers; forbidden without collection:read", async () => {
    session.roles = ["editor"]
    await expect(inner(CollectionsPage())).rejects.toThrow(
      "REDIRECT /admin/collections/team"
    )
    session.roles = ["author"]
    await expect(inner(CollectionsPage())).rejects.toThrow("FORBIDDEN")
  })
})

describe("/admin/settings/[key]", () => {
  it("an unknown key 404s although permissionFor allows settings readers", async () => {
    // The registry answers for /admin/settings/* by prefix, so the page
    // guard alone would let a reader through; the page 404s on the key.
    expect(permissionFor("/admin/settings/nope")).toEqual({
      settings: ["read"],
    })
    const page = SettingsKeyPage({ params: params({ key: "nope" }) } as never)
    await expect(inner(page)).rejects.toThrow("NOT_FOUND")
    expect(session.requirePermission).not.toHaveBeenCalled()
  })

  it.each(["consent", "tracking", "customCode", "seo.defaults"])(
    "%s is edited elsewhere (Phases 8/9): not a Site settings page",
    async (key) => {
      const page = SettingsKeyPage({ params: params({ key }) } as never)
      await expect(inner(page)).rejects.toThrow("NOT_FOUND")
    }
  )

  it.each(EDITABLE_SETTINGS_KEYS)(
    "%s renders its editor behind the key's read permission",
    async (key) => {
      const out = await inner(
        SettingsKeyPage({ params: params({ key }) } as never)
      )
      expect(session.requirePermission).toHaveBeenCalledWith(
        SETTINGS_ENTRIES[key].read
      )
      expect(out!.type).toBe(SettingsEditor)
      expect(out!.props).toMatchObject({ settingsKey: key })
    }
  )
})

describe("dashboard, help, activity and users pages (4.7)", () => {
  it("/admin/activity needs audit:read", async () => {
    await inner(ActivityPage())
    expect(session.requirePermission).toHaveBeenCalledWith({
      audit: ["read"],
    })
    session.roles = ["editor"]
    await expect(inner(ActivityPage())).rejects.toThrow("FORBIDDEN")
  })

  it("/admin/users and /admin/users/[id] need user:read; a bad id 404s after the check", async () => {
    await inner(UsersPage())
    expect(session.requirePermission).toHaveBeenCalledWith({ user: ["read"] })
    session.roles = ["editor"]
    await expect(inner(UsersPage())).rejects.toThrow("FORBIDDEN")
    await expect(
      inner(UserPage({ params: params({ id: "not-a-uuid" }) } as never))
    ).rejects.toThrow("FORBIDDEN")
    session.roles = ["owner"]
    await expect(
      inner(UserPage({ params: params({ id: "not-a-uuid" }) } as never))
    ).rejects.toThrow("NOT_FOUND")
  })

  it("/admin/media needs media:read (every role has it) and renders the library", async () => {
    const out = await inner(MediaPage())
    expect(session.requirePage).toHaveBeenCalledWith("/admin/media")
    expect(out).not.toBeNull()
    expect(permissionFor("/admin/media")).toEqual({ media: ["read"] })
  })

  it("the dashboard and Help open for every signed-in role", async () => {
    session.roles = ["viewer"]
    expect(permissionFor("/admin")).toBeNull()
    expect(permissionFor("/admin/help")).toBeNull()
  })
})

describe("Blog pages (5.3)", () => {
  const ID = "0192abcd-0000-7000-8000-000000000001"

  it("/admin/blog needs article:read; /admin/blog/categories needs collection:read", async () => {
    session.roles = ["author"]
    await inner(BlogPage())
    expect(session.requirePermission).toHaveBeenCalledWith({
      article: ["read"],
    })
    await expect(inner(BlogCategoriesPage())).rejects.toThrow("FORBIDDEN")
    session.roles = ["editor"]
    await inner(BlogCategoriesPage())
    session.roles = ["intake"]
    await expect(inner(BlogPage())).rejects.toThrow("FORBIDDEN")
  })

  it("/admin/blog/new also needs article:create (a viewer reads but cannot create)", async () => {
    session.roles = ["author"]
    await inner(NewArticlePage())
    expect(session.requirePermission).toHaveBeenCalledWith({
      article: ["create"],
    })
    session.roles = ["editor"]
    await inner(NewArticlePage())
    session.roles = ["viewer"]
    await expect(inner(NewArticlePage())).rejects.toThrow("FORBIDDEN")
  })

  it("/admin/blog/[id]: forbidden first, then a bad id 404s, then the editor renders", async () => {
    session.roles = ["intake"]
    await expect(
      inner(ArticlePage({ params: params({ id: "nope" }) } as never))
    ).rejects.toThrow("FORBIDDEN")
    session.roles = ["owner"]
    await expect(
      inner(ArticlePage({ params: params({ id: "nope" }) } as never))
    ).rejects.toThrow("NOT_FOUND")
    const out = await inner(
      ArticlePage({ params: params({ id: ID }) } as never)
    )
    expect(out!.props).toMatchObject({ id: ID })
  })

  it("/admin/settings/ai-assistant is the AI settings view", async () => {
    const out = await inner(AiAssistantPage())
    expect(out!.type).toBe(AiSettingsView)
    session.roles = ["editor"]
    await expect(inner(AiAssistantPage())).rejects.toThrow("FORBIDDEN")
  })

  it("the old AI integration slug redirects to the AI assistant page", async () => {
    const page = IntegrationPage({
      params: params({ slug: "ai" }),
    } as never)
    await expect(inner(page)).rejects.toThrow(
      "REDIRECT /admin/settings/ai-assistant"
    )
    const smtp = await inner(
      IntegrationPage({ params: params({ slug: "smtp" }) } as never)
    )
    expect(smtp!.props).toMatchObject({ integrationKey: "integrations.smtp" })
  })
})
