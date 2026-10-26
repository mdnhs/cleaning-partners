import { describe, expect, it } from "vitest"

import type { AiConfig } from "@/lib/schemas/integrations"
import type { Actor } from "@/server/lib/actor"
import { screenContextFor } from "@/server/modules/ai/screen-context"

const actor = { roles: ["editor"] } as unknown as Actor
const config = {
  shareEnquiryDetails: { enabled: false },
} as unknown as AiConfig
const record = { blocks: [{ id: "b1", type: "richtext", data: {} }] }

describe("screenContextFor: site-copy screens", () => {
  it("a builder page's draft record passes unchanged (R10-13)", async () => {
    const context = {
      screen: "Spring campaign",
      entityType: "builder",
      entityId: "0199a000-0000-7000-8000-0000000000aa",
      record,
    }
    const result = await screenContextFor(actor, config, context)
    expect(result.context).toEqual(context)
    expect(result.enquiryDetails).toBe(false)
  })

  it("an unknown entity type still drops the record and keeps the focused field", async () => {
    const field = {
      path: "title",
      label: "Title",
      value: "Hello",
      maxLength: 80,
    }
    const result = await screenContextFor(actor, config, {
      screen: "Elsewhere",
      entityType: "builders",
      record,
      field,
    } as never)
    expect(result.context).not.toHaveProperty("record")
    expect(result.context).toMatchObject({ entityType: "builders", field })
  })
})
