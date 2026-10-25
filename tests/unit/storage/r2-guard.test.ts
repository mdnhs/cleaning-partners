import { describe, expect, it } from "vitest"

import { getStorage, r2Storage, storageFor } from "@/server/lib/storage"

describe("R2 stays off until Phase 6 (R4-1)", () => {
  it("new uploads always resolve to the disk driver", async () => {
    expect((await getStorage()).name).toBe("disk")
  })

  it("the R2 driver and r2 rows throw instead of writing", async () => {
    expect(() => r2Storage()).toThrow("R2 disabled until Phase 6")
    await expect(storageFor("r2")).rejects.toThrow("R2 disabled until Phase 6")
    expect(await storageFor("static")).toBeNull()
    expect((await storageFor("disk"))?.name).toBe("disk")
  })
})
