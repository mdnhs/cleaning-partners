import { isValidElement, type ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CHAT_SETTINGS_DEFAULT } from "@/lib/chat/defaults"
import type { ChatWidgetProps } from "@/lib/chat/text"

const state = vi.hoisted(() => ({
  draft: false,
  chat: null as unknown,
  contact: null as unknown,
  connections: 0,
}))

vi.mock("next/server", () => ({
  connection: async () => {
    state.connections += 1
  },
}))
vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: state.draft }),
}))
vi.mock("@/server/modules/settings/queries", () => ({
  getPublishedSettings: async (key: string) => {
    const value =
      key === "chat" ? state.chat : key === "contact" ? state.contact : null
    if (value instanceof Error) throw value
    return value
  },
}))
vi.mock("@/components/chat/chat-launcher", () => ({
  ChatLauncher: () => null,
}))

import { ChatLauncher } from "@/components/chat/chat-launcher"
import { ChatSlot } from "@/components/chat/chat-slot"

const CONTACT = { quoteHref: "/contact#quote" }
const ON = { ...CHAT_SETTINGS_DEFAULT, enabled: true }

beforeEach(() => {
  state.draft = false
  state.chat = ON
  state.contact = CONTACT
  state.connections = 0
})

describe("ChatSlot", () => {
  it("null when chat settings are null, disabled, or in draft mode", async () => {
    state.chat = null
    expect(await ChatSlot()).toBeNull()
    state.chat = CHAT_SETTINGS_DEFAULT
    expect(await ChatSlot()).toBeNull()
    state.chat = ON
    state.contact = null
    expect(await ChatSlot()).toBeNull()
    state.contact = CONTACT
    state.draft = true
    expect(await ChatSlot()).toBeNull()
    expect(state.connections).toBe(4)
  })

  it("renders the launcher with the filled team and bot names when enabled", async () => {
    const el = (await ChatSlot()) as ReactElement<ChatWidgetProps>
    expect(isValidElement(el)).toBe(true)
    expect(el.type).toBe(ChatLauncher)
    expect(el.props.team).toBe("the Cleaning Partners team")
    expect(el.props.botName).toBe("Assistant")
    expect(el.props.quoteHref).toBe("/contact#quote")
    expect(el.props.copy).toEqual(CHAT_SETTINGS_DEFAULT.copy)
    expect(el.props.hint).toEqual(CHAT_SETTINGS_DEFAULT.hint)
  })

  it("a failed read is treated as off", async () => {
    state.chat = new Error("db down")
    expect(await ChatSlot()).toBeNull()
  })
})
