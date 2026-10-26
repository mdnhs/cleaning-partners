import { S3Client } from "@aws-sdk/client-s3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getDb } from "@/server/db/client"
import type { Actor } from "@/server/lib/actor"
import { resetR2Client } from "@/server/lib/r2-client"
import { getStorage, storageFor } from "@/server/lib/storage"
import { saveIntegration } from "@/server/modules/integrations/service"

import { resetDb } from "../db"
import { createUser } from "../helpers/auth"

let actor: Actor

const R2_VALUES = {
  accountId: "0123456789abcdef0123456789abcdef",
  jurisdiction: "default",
  bucket: "cp-media",
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
}

beforeEach(async () => {
  await resetDb()
  const owner = await createUser({ roles: ["owner"] })
  actor = {
    userId: owner.id,
    roles: ["owner"],
    ip: null,
    userAgent: null,
    impersonatorId: null,
  }
})
afterEach(() => {
  resetR2Client()
  vi.restoreAllMocks()
})

const saveR2 = (values: Record<string, string> = R2_VALUES, version = 0) =>
  saveIntegration(actor, "integrations.r2", { version, values })

describe("R2 guard: integrations.r2 decides the driver, writes stay under cp/ (R6-1)", () => {
  it("R2 saved → getStorage returns the r2 driver whose Put Key is cp/<keyPrefix>/<key>", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockResolvedValue({} as never)
    await saveR2({ ...R2_VALUES, keyPrefix: "media" })
    const driver = await getStorage()
    expect(driver.name).toBe("r2")
    await driver.put("2026/10/a.png", new Uint8Array([1]), "image/png")
    await (await storageFor("r2", getDb()))!.delete("2026/10/a.png")
    const keys = send.mock.calls.map(
      ([c]) => (c as { input: { Key: string } }).input.Key
    )
    expect(keys).toEqual(["cp/media/2026/10/a.png", "cp/media/2026/10/a.png"])
  })

  it("R2 unset → disk, and storageFor('r2', db) is null", async () => {
    expect((await getStorage(getDb())).name).toBe("disk")
    expect(await storageFor("r2", getDb())).toBeNull()
  })
})
