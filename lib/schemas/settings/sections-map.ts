import { z } from "zod"

import { href, mediaRef, text } from "../common"

/** settings.sections.map — the location map card of the home and contact pages. */
export const mapSectionSettings = z.object({
  ariaLabel: text,
  /** Tile URL template; {index} is the tile number (0–31). */
  tileImagePattern: text,
  /** Where the map links to (Google Maps). */
  href,
  markerLabel: text,
  pin: mediaRef,
})
export type MapSectionSettings = z.infer<typeof mapSectionSettings>
