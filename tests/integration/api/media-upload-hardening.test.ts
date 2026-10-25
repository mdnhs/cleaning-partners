import sharp from "sharp"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { MediaItem } from "@/lib/schemas/api/media"
import { app } from "@/server/api/app"
import { diskStorage } from "@/server/lib/storage"

import { resetDb } from "../db"
import { ORIGIN, signedInUser } from "../helpers/auth"

let editor: string
const created: string[] = []

beforeAll(async () => {
  await resetDb()
  editor = (await signedInUser(["editor"])).cookie
})

afterAll(async () => {
  const disk = diskStorage()
  for (const key of created) await disk.delete(key)
})

async function upload(
  file: { bytes: Uint8Array | Buffer; name: string; type: string },
  cookie = editor
) {
  const form = new FormData()
  form.append(
    "file",
    new File([new Uint8Array(file.bytes)], file.name, { type: file.type })
  )
  const res = await app.request("/api/v1/admin/media/upload", {
    method: "POST",
    headers: { origin: ORIGIN, cookie },
    body: form,
  })
  const body = (await res.json()) as MediaItem & {
    error?: { code: string; message: string }
  }
  if (res.status === 201 && body.driver === "disk")
    created.push(body.url.replace("/api/v1/media/file/", ""))
  return { status: res.status, body }
}

const png = () =>
  sharp({ create: { width: 6, height: 4, channels: 3, background: "#123456" } })
    .png()
    .toBuffer()

describe("file route hardening", () => {
  it("serves only keys with a media row (orphans, temp files, healthchecks are 404)", async () => {
    const disk = diskStorage()
    for (const key of [
      "2026/10/orphan.png",
      "healthcheck-x.txt",
      "2026/10/a.png.tmp",
    ]) {
      await disk.put(key, await png(), "image/png")
      created.push(key)
      expect((await app.request(`/api/v1/media/file/${key}`)).status, key).toBe(
        404
      )
    }
  })

  it("sends nosniff and no disposition for raster images", async () => {
    const { body } = await upload({
      bytes: await png(),
      name: "a.png",
      type: "image/png",
    })
    const file = await app.request(body.url)
    expect(file.status).toBe(200)
    expect(file.headers.get("x-content-type-options")).toBe("nosniff")
    expect(file.headers.get("content-disposition")).toBeNull()
    expect(file.headers.get("content-security-policy")).toBeNull()
  })

  it("decodes the raw path exactly once", async () => {
    const { body } = await upload({
      bytes: await png(),
      name: "a.png",
      type: "image/png",
    })
    // The catch-all hands Hono the raw URL: encoded unreserved characters
    // still name the same (valid) key...
    const encoded = body.url
      .replace(/\.png$/, "%2Epng")
      .replace("/file/2", "/file/%32")
    expect((await app.request(encoded)).status).toBe(200)
    // ...and a double-encoded one is not decoded twice.
    expect(
      (await app.request(body.url.replace(/\.png$/, "%252Epng"))).status
    ).toBe(404)
  })

  it("serves SVG with its own type, sandboxed, whatever the upload claimed", async () => {
    const { body } = await upload({
      bytes: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>'
      ),
      name: "x.svg",
      type: "text/html",
    })
    const file = await app.request(body.url)
    expect(file.headers.get("content-type")).toBe("image/svg+xml")
    expect(file.headers.get("content-security-policy")).toMatch(
      /^default-src 'none'.*; sandbox$/
    )
    expect(file.headers.get("x-content-type-options")).toBe("nosniff")
  })

  it("publishes photos without EXIF/GPS, upright, with their ICC profile", async () => {
    const photo = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#336699" },
    })
      .jpeg()
      .withExif({
        IFD0: { Make: "PhoneCo" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "53/1 20/1 0/1" },
      })
      .withMetadata({ orientation: 6 })
      .withIccProfile("p3")
      .toBuffer()
    expect((await sharp(photo).metadata()).exif).toBeDefined()

    const { status, body } = await upload({
      bytes: photo,
      name: "IMG_0001.jpg",
      type: "image/jpeg",
    })
    expect(status).toBe(201)
    expect(body).toMatchObject({ mime: "image/jpeg", width: 30, height: 40 })
    const served = Buffer.from(
      await (await app.request(body.url)).arrayBuffer()
    )
    expect(served.byteLength).toBe(body.size)
    const meta = await sharp(served).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    expect(meta.icc).toBeDefined()
    expect(meta).toMatchObject({ width: 30, height: 40 })
    expect(served.includes("PhoneCo")).toBe(false)
  })

  it("never uses the uploaded file name in the key", async () => {
    const { status, body } = await upload({
      bytes: await png(),
      name: "../../evil.png",
      type: "image/png",
    })
    expect(status).toBe(201)
    expect(body.originalName).toBe("evil.png")
    expect(body.url).not.toContain("evil")
  })
})
