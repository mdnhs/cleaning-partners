import { describe, expect, it } from "vitest"

import { fillChatText } from "@/lib/chat/text"

describe("fillChatText", () => {
  it("fills the given placeholders", () => {
    expect(
      fillChatText("{botName} (AI) · {team} can join", {
        botName: "Assistant",
        team: "the Cleaning Partners team",
      })
    ).toBe("Assistant (AI) · the Cleaning Partners team can join")
  })

  it("leaves unknown and missing placeholders as typed", () => {
    expect(fillChatText("Hi {x} {team}", {})).toBe("Hi {x} {team}")
  })
})
