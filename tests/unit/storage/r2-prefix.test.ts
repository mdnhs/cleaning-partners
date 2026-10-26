import type { S3Client } from "@aws-sdk/client-s3"
import { describe, expect, it, vi } from "vitest"

import type { R2Config } from "@/lib/schemas/integrations"
import { r2Config as r2 } from "@/lib/schemas/integrations/r2"
import { R2_PREFIX, r2ObjectKey } from "@/server/lib/r2-client"
import {
  R2_PREFIX as R2_PREFIX_REEXPORT,
  r2Storage,
} from "@/server/lib/storage/r2"

const base: R2Config = {
  accountId: "0123456789abcdef0123456789abcdef",
  jurisdiction: "default",
  bucket: "shared-media",
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
}
const KEY = "2026/10/0190a6e0-0000-7000-8000-000000000001.png"
const HOSTILE = ["..", "../sp", "/x", "a//b", "a\\b", "a/../b", "\\x", "a/"]

/** Records every command the driver sends. */
function recorder() {
  const commands: { name: string; input: Record<string, unknown> }[] = []
  const send = vi.fn(
    async (command: {
      constructor: { name: string }
      input: Record<string, unknown>
    }) => {
      commands.push({ name: command.constructor.name, input: command.input })
      if (command.constructor.name === "GetObjectCommand")
        return {
          ContentLength: 1,
          ContentRange: "bytes 0-0/1",
          Body: {
            transformToByteArray: async () => new Uint8Array([1]),
            transformToWebStream: () => new Response("a").body!,
          },
        }
      return {}
    }
  )
  return { client: { send, destroy: vi.fn() } as unknown as S3Client, commands }
}

describe("R6-1 hard cp/ root", () => {
  it("R2_PREFIX is cp/ and is one definition re-exported by the driver", () => {
    expect(R2_PREFIX).toBe("cp/")
    expect(R2_PREFIX_REEXPORT).toBe(R2_PREFIX)
  })

  it("r2ObjectKey is always cp/ + optional keyPrefix/ + key", () => {
    expect(r2ObjectKey(base, KEY)).toBe(`cp/${KEY}`)
    expect(r2ObjectKey({ ...base, keyPrefix: "" }, KEY)).toBe(`cp/${KEY}`)
    expect(r2ObjectKey({ ...base, keyPrefix: "media" }, KEY)).toBe(
      `cp/media/${KEY}`
    )
    expect(r2ObjectKey({ ...base, keyPrefix: "a/b" }, KEY)).toBe(
      `cp/a/b/${KEY}`
    )
  })

  it("a list prefix built by r2ObjectKey starts with cp/ (bare, folder, sub-prefix)", () => {
    expect(r2ObjectKey(base, "")).toBe("cp/")
    expect(r2ObjectKey({ ...base, keyPrefix: "media" }, "")).toBe("cp/media/")
    expect(r2ObjectKey(base, "backups/")).toBe("cp/backups/")
  })

  it("every put, get, head and delete Key starts with cp/, with and without keyPrefix", async () => {
    for (const keyPrefix of [undefined, "", "media", "a/b"]) {
      const { client, commands } = recorder()
      const driver = r2Storage({ ...base, keyPrefix }, client)
      await driver.put(KEY, new Uint8Array([1]), "image/png")
      await driver.read(KEY)
      await driver.stream(KEY)
      await driver.stream(KEY, { start: 0, end: 0 })
      await driver.delete(KEY)
      await driver.test()
      const keyed = commands.filter((c) => c.name !== "HeadBucketCommand")
      expect(keyed.map((c) => c.name)).toEqual([
        "PutObjectCommand",
        "GetObjectCommand",
        "GetObjectCommand",
        "GetObjectCommand",
        "DeleteObjectCommand",
      ])
      const expected = keyPrefix ? `cp/${keyPrefix}/${KEY}` : `cp/${KEY}`
      for (const c of keyed) {
        expect(c.input.Key).toBe(expected)
        expect(String(c.input.Key).startsWith("cp/")).toBe(true)
      }
      // HeadBucket carries no key.
      expect(commands.at(-1)).toMatchObject({ name: "HeadBucketCommand" })
      expect(commands.at(-1)!.input).toEqual({ Bucket: "shared-media" })
    }
  })

  it("hostile keyPrefix values are rejected by the schema", () => {
    const valid = { ...base, keyPrefix: "" }
    for (const bad of HOSTILE)
      expect(r2.safeParse({ ...valid, keyPrefix: bad }).success, bad).toBe(
        false
      )
  })

  it("hostile keyPrefix values are rejected by r2ObjectKey and the driver sends nothing", async () => {
    for (const bad of HOSTILE) {
      expect(() => r2ObjectKey({ ...base, keyPrefix: bad }, KEY), bad).toThrow()
      const { client, commands } = recorder()
      const driver = r2Storage({ ...base, keyPrefix: bad }, client)
      await expect(
        driver.put(KEY, new Uint8Array([1]), "image/png")
      ).rejects.toThrow()
      await expect(driver.read(KEY)).rejects.toThrow()
      await expect(driver.delete(KEY)).rejects.toThrow()
      expect(commands).toEqual([])
    }
  })

  it("a hostile key cannot climb out of cp/", () => {
    for (const bad of ["../sp/x", "/abs", "a/../../b", "a\\b", "./x"])
      expect(() => r2ObjectKey(base, bad), bad).toThrow()
  })
})
