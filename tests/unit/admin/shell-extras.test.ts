import { beforeEach, describe, expect, it, vi } from "vitest"

const { leadBadge, getAiStatus, getShellNotifications, unreadCount } =
  vi.hoisted(() => ({
    leadBadge: vi.fn(),
    getAiStatus: vi.fn(),
    getShellNotifications: vi.fn(),
    unreadCount: vi.fn(),
  }))
vi.mock("@/server/modules/leads/service", () => ({ leadBadge }))
vi.mock("@/server/modules/ai/service", () => ({ getAiStatus }))
vi.mock("@/server/modules/dashboard/service", () => ({
  getShellNotifications,
}))
vi.mock("@/server/modules/chat/repo", () => ({ unreadCount }))

import type { Actor } from "@/server/lib/actor"
import { loadShellExtras } from "@/server/lib/admin-shell-extras"

const actor = (roles: Actor["roles"]): Actor => ({
  userId: "u1",
  roles,
  ip: null,
  userAgent: null,
  impersonatorId: null,
})

const status = { available: true } as never

beforeEach(() => {
  leadBadge.mockReset().mockResolvedValue({ newLeads: 3 })
  getAiStatus.mockReset().mockResolvedValue(status)
  getShellNotifications.mockReset().mockResolvedValue([])
  unreadCount.mockReset().mockResolvedValue(2)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("admin frame extras (SP final review I7)", () => {
  it("loads the badge, AI status and bell; the bell reuses the badge count", async () => {
    const extras = await loadShellExtras(actor(["intake"]))
    expect(extras).toEqual({
      badges: { "new-leads": 3, "chat-unread": 2 },
      assistant: status,
      notifications: [],
    })
    expect(getShellNotifications).toHaveBeenCalledWith(expect.anything(), 3)
  })

  it("skips the badge for those who cannot read leads", async () => {
    const extras = await loadShellExtras(actor(["editor"]))
    expect(extras.badges).toEqual({})
    expect(leadBadge).not.toHaveBeenCalled()
    expect(unreadCount).not.toHaveBeenCalled()
    expect(getShellNotifications).toHaveBeenCalledWith(expect.anything(), null)
  })

  it("gives a chat:read actor the unread chats badge", async () => {
    const extras = await loadShellExtras(actor(["owner"]))
    expect(extras.badges["chat-unread"]).toBe(2)
    expect(unreadCount).toHaveBeenCalledTimes(1)
  })

  it("a failing chat count leaves no chat badge and keeps the frame", async () => {
    unreadCount.mockRejectedValue(new Error("chat table locked"))
    const extras = await loadShellExtras(actor(["intake"]))
    expect(extras.badges).toEqual({ "new-leads": 3 })
    expect(extras.assistant).toBe(status)
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it("degrades each part on its own instead of failing the frame", async () => {
    leadBadge.mockRejectedValue(new Error("db hiccup"))
    unreadCount.mockRejectedValue(new Error("db hiccup"))
    getAiStatus.mockRejectedValue(new Error("ai settings unreadable"))
    getShellNotifications.mockRejectedValue(new Error("jobs table locked"))
    await expect(loadShellExtras(actor(["owner"]))).resolves.toEqual({
      badges: {},
      assistant: undefined,
      notifications: [],
    })
    expect(console.error).toHaveBeenCalledTimes(4)
  })
})
