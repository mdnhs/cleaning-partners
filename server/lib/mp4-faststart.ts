import "server-only"

/**
 * MP4 "faststart": moves the `moov` box (the index) in front of `mdat`, so
 * Safari / iOS can start playing from the first bytes instead of needing the
 * end of the file. Pure byte work, no transcoding: the media is untouched,
 * only the chunk offsets in `stco` / `co64` are shifted by the moved size.
 * Anything unexpected returns the input unchanged (never throws).
 */

type Box = { type: string; start: number; end: number; header: number }

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl"])

function readBox(view: DataView, pos: number, limit: number): Box | null {
  if (pos + 8 > limit) return null
  let size = view.getUint32(pos)
  const type = String.fromCharCode(
    view.getUint8(pos + 4),
    view.getUint8(pos + 5),
    view.getUint8(pos + 6),
    view.getUint8(pos + 7)
  )
  let header = 8
  if (size === 1) {
    if (pos + 16 > limit) return null
    const big = view.getBigUint64(pos + 8)
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null
    size = Number(big)
    header = 16
  } else if (size === 0) {
    size = limit - pos
  }
  if (size < header || pos + size > limit) return null
  return { type, start: pos, end: pos + size, header }
}

function boxes(view: DataView, from: number, to: number): Box[] | null {
  const out: Box[] = []
  for (let pos = from; pos < to;) {
    const box = readBox(view, pos, to)
    if (!box) return null
    out.push(box)
    pos = box.end
  }
  return out
}

/** Adds `delta` to every chunk offset under `moov` (in place); false if it cannot. */
function shiftOffsets(
  view: DataView,
  from: number,
  to: number,
  delta: number
): boolean {
  const children = boxes(view, from, to)
  if (!children) return false
  for (const box of children) {
    const body = box.start + box.header
    if (CONTAINERS.has(box.type)) {
      if (!shiftOffsets(view, body, box.end, delta)) return false
    } else if (box.type === "stco" || box.type === "co64") {
      const wide = box.type === "co64"
      const count = view.getUint32(body + 4)
      const entry = wide ? 8 : 4
      if (body + 8 + count * entry > box.end) return false
      for (let i = 0; i < count; i++) {
        const at = body + 8 + i * entry
        if (wide) {
          view.setBigUint64(at, view.getBigUint64(at) + BigInt(delta))
        } else {
          const next = view.getUint32(at) + delta
          if (next > 0xffffffff) return false
          view.setUint32(at, next)
        }
      }
    }
  }
  return true
}

export function faststartMp4(
  bytes: Uint8Array<ArrayBuffer>
): Uint8Array<ArrayBuffer> {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const top = boxes(view, 0, bytes.byteLength)
    if (!top) return bytes
    const moovAt = top.findIndex((b) => b.type === "moov")
    const mdatAt = top.findIndex((b) => b.type === "mdat")
    // Already faststart (or nothing to do): leave it exactly as uploaded.
    if (moovAt < 0 || mdatAt < 0 || moovAt < mdatAt) return bytes
    const moov = top[moovAt]
    const firstMdat = top[mdatAt]
    const size = moov.end - moov.start
    const out = new Uint8Array(bytes.byteLength)
    const outView = new DataView(out.buffer)
    // [everything before the first mdat] [moov] [the rest, minus the old moov]
    out.set(bytes.subarray(0, firstMdat.start), 0)
    out.set(bytes.subarray(moov.start, moov.end), firstMdat.start)
    out.set(bytes.subarray(firstMdat.start, moov.start), firstMdat.start + size)
    out.set(bytes.subarray(moov.end), moov.end)
    const newMoov = firstMdat.start
    if (!shiftOffsets(outView, newMoov + moov.header, newMoov + size, size))
      return bytes
    return out
  } catch {
    return bytes
  }
}
