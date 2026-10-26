import { beforeEach, describe, expect, it, vi } from "vitest"

const { leadBadge, getShellNotifications } = vi.hoisted(() => ({
  leadBadge: vi.fn(),
  getShellNotifications: vi.fn(),
}))
vi.mock("@/server/modules/leads/service", () => ({ leadBadge }))
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

beforeEach(() => {
  leadBadge.mockReset().mockResolvedValue({ newLeads: 3 })
  getShellNotifications.mockReset().mockResolvedValue([])
  vi.spyOn(console, "error").mockImplementation(() => {})
})

// The AI status case returns with the assistant (9.3).
describe("admin frame extras (SP final review I7)", () => {
  it("loads the badge and the bell; the bell reuses the badge count", async () => {
    const extras = await loadShellExtras(actor(["intake"]))
    expect(extras).toEqual({
      badges: { "new-leads": 3 },
      notifications: [],
    })
    expect(getShellNotifications).toHaveBeenCalledWith(expect.anything(), 3)
  })

  it("skips the badge for those who cannot read leads", async () => {
    const extras = await loadShellExtras(actor(["editor"]))
    expect(extras.badges).toEqual({})
    expect(leadBadge).not.toHaveBeenCalled()
    expect(getShellNotifications).toHaveBeenCalledWith(expect.anything(), null)
  })

  it("degrades each part on its own instead of failing the frame", async () => {
    leadBadge.mockRejectedValue(new Error("db hiccup"))
    getShellNotifications.mockRejectedValue(new Error("jobs table locked"))
    await expect(loadShellExtras(actor(["owner"]))).resolves.toEqual({
      badges: {},
      notifications: [],
    })
    expect(console.error).toHaveBeenCalledTimes(2)
  })
})
