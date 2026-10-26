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

vi.mock("@/components/admin/settings/settings-editor", () => ({
  SettingsEditor: () => null,
}))

import ActivityPage from "@/app/(admin)/admin/(panel)/activity/page"
import CollectionsPage from "@/app/(admin)/admin/(panel)/collections/page"
import UserPage from "@/app/(admin)/admin/(panel)/users/[id]/page"
import UsersPage from "@/app/(admin)/admin/(panel)/users/page"
import SettingsKeyPage from "@/app/(admin)/admin/(panel)/settings/[key]/page"
import SettingsPage from "@/app/(admin)/admin/(panel)/settings/page"
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

  it("the dashboard and Help open for every signed-in role", async () => {
    session.roles = ["viewer"]
    expect(permissionFor("/admin")).toBeNull()
    expect(permissionFor("/admin/help")).toBeNull()
  })
})
