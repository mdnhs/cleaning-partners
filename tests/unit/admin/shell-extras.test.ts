import { beforeEach, describe, expect, it, vi } from "vitest"

const { getShellNotifications } = vi.hoisted(() => ({
  getShellNotifications: vi.fn(),
}))
vi.mock("@/server/modules/dashboard/service", () => ({
  getShellNotifications,
}))

import type { Actor } from "@/server/lib/actor"
import { loadShellExtras } from "@/server/lib/admin-shell-extras"

const actor = (roles: Actor["roles"]): Actor => ({
  userId: "u1",
  roles,
  ip: null,
  userAgent: null,
  impersonatorId: null,
})

const item = {
  id: "failed-jobs",
  title: "Background jobs need attention",
  description: "x",
  href: "/admin",
}

beforeEach(() => {
  getShellNotifications.mockReset().mockResolvedValue([])
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("admin frame extras (SP final review I7)", () => {
  it("feeds the bell with newLeads null and no badges until Phase 7", async () => {
    getShellNotifications.mockResolvedValue([item])
    const extras = await loadShellExtras(actor(["owner"]))
    expect(extras).toEqual({ badges: {}, notifications: [item] })
    expect(getShellNotifications).toHaveBeenCalledWith(expect.anything(), null)
  })

  it("degrades to an empty bell instead of failing the frame", async () => {
    getShellNotifications.mockRejectedValue(new Error("jobs table locked"))
    await expect(loadShellExtras(actor(["owner"]))).resolves.toEqual({
      badges: {},
      notifications: [],
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
