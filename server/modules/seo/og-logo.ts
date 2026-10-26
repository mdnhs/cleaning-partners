import "server-only"

import { readFile } from "node:fs/promises"

import { staticFilePath, storageFor } from "@/server/lib/storage"

import type { OgLogo } from "./queries"

/** Raster and SVG formats Satori can draw; anything else prints the site name. */
const DRAWABLE = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
])
const LOGO_HEIGHT = 72
const LOGO_MAX_WIDTH = 360

/** A larger logo is not inlined into the card: it prints the site name. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export type LogoImage = { src: string; width: number; height: number }

/**
 * The logo as a data URI for the share card. `image` is null when the card
 * prints the site name instead. `transient` is true only when a logo is
 * configured, drawable and small enough but the read threw (a storage
 * error): the caller then caches the card briefly, so an outage does not
 * pin a card without its logo.
 */
export async function loadLogo(
  logo: OgLogo | null
): Promise<{ image: LogoImage | null; transient: boolean }> {
  if (!logo || !DRAWABLE.has(logo.mime) || logo.size > LOGO_MAX_BYTES)
    return { image: null, transient: false }
  try {
    let bytes: Uint8Array | null
    if (logo.driver === "static")
      bytes = await readFile(staticFilePath(logo.key))
    else bytes = (await (await storageFor(logo.driver))?.read(logo.key)) ?? null
    // Nothing there: the object is gone or the driver is missing. Only a
    // thrown read error is an outage worth a short cache.
    if (!bytes || bytes.length === 0) return { image: null, transient: false }
    // The stored size can be stale: the bytes read are what get inlined.
    if (bytes.length > LOGO_MAX_BYTES) return { image: null, transient: false }
    const ratio = logo.width && logo.height ? logo.width / logo.height : 3
    const width = Math.min(LOGO_MAX_WIDTH, Math.round(LOGO_HEIGHT * ratio))
    return {
      image: {
        src: `data:${logo.mime};base64,${Buffer.from(bytes).toString("base64")}`,
        width,
        height: Math.round(width / ratio),
      },
      transient: false,
    }
  } catch {
    return { image: null, transient: true }
  }
}
