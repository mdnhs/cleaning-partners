import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { app } from "@/server/api/app"
import { getDb } from "@/server/db/client"
import { media } from "@/server/db/schema"
import { prepareCv, storeCv } from "@/server/lib/cv"
import { diskStorage } from "@/server/lib/storage"
import { mediaFileUrl } from "@/server/lib/storage/paths"

import { resetDb } from "../db"

let key: string

beforeAll(async () => {
  await resetDb()
  const pdf = new TextEncoder().encode("%PDF-1.7\nprivate cv\n")
  const cv = await prepareCv(
    new File([pdf], "cv.pdf", { type: "application/pdf" })
  )
  key = (await storeCv(cv!)).key
})

afterAll(async () => {
  await diskStorage().delete(key)
})

describe("private files (CVs)", () => {
  it("are stored under the private prefix", async () => {
    expect(key).toMatch(
      /^private\/applications\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/
    )
    expect(await diskStorage().read(key)).not.toBeNull()
  })

  it("public file route never serves a CV key", async () => {
    const res = await app.request(mediaFileUrl(key))
    expect(res.status).toBe(404)
    const head = await app.request(mediaFileUrl(key), { method: "HEAD" })
    expect(head.status).toBe(404)
  })

  it("stays private even if a media row ever named its key", async () => {
    await getDb().insert(media).values({
      key,
      driver: "disk",
      mime: "application/pdf",
      size: 20,
    })
    const res = await app.request(mediaFileUrl(key))
    expect(res.status).toBe(404)
  })
})

