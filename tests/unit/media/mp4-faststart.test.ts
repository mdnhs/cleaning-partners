import { describe, expect, it } from "vitest"

import { faststartMp4 } from "@/server/lib/mp4-faststart"

const u32 = (n: number) => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
]
const box = (type: string, ...body: number[][]) => {
  const flat = body.flat()
  return [
    ...u32(8 + flat.length),
    ...[...type].map((c) => c.charCodeAt(0)),
    ...flat,
  ]
}
const stco = (offset: number) => box("stco", [0, 0, 0, 0], u32(1), u32(offset))
const moov = (offset: number) =>
  box("moov", box("trak", box("mdia", box("minf", box("stbl", stco(offset))))))

function build(moovFirst: boolean) {
  const ftyp = box(
    "ftyp",
    [..."isom"].map((c) => c.charCodeAt(0)),
    u32(0)
  )
  const mdat = box("mdat", [1, 2, 3, 4, 5, 6, 7, 8])
  const size = moov(0).length
  const mdatPos = ftyp.length + (moovFirst ? size : 0)
  const m = moov(mdatPos + 8)
  const parts = moovFirst ? [ftyp, m, mdat] : [ftyp, mdat, m]
  return new Uint8Array(parts.flat())
}

const typesOf = (b: Uint8Array) => {
  const out: string[] = []
  for (let i = 0; i < b.length;) {
    out.push(String.fromCharCode(...b.subarray(i + 4, i + 8)))
    i += new DataView(b.buffer, b.byteOffset).getUint32(i)
  }
  return out
}

describe("faststartMp4", () => {
  it("moves moov before mdat and shifts the chunk offset to the new mdat data", () => {
    const out = faststartMp4(build(false))
    expect(typesOf(out)).toEqual(["ftyp", "moov", "mdat"])
    expect(out).toEqual(build(true))
  })

  it("leaves a faststart file untouched", () => {
    const input = build(true)
    expect(faststartMp4(input)).toBe(input)
  })

  it("returns garbage unchanged", () => {
    const input = new Uint8Array([1, 2, 3])
    expect(faststartMp4(input)).toBe(input)
  })
})
