import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { cacheLife, cacheTag } from "next/cache"
import { ImageResponse } from "next/og"

import { ogCard } from "@/lib/seo/og-card"
import { OG_IMAGE_SIZE, type OgKind } from "@/lib/seo/urls"
import { tag } from "@/server/lib/cache-tags"
import { publicOrigin } from "@/server/lib/site-origin"
import { staticFilePath, storageFor } from "@/server/lib/storage"
import {
  getOgLogo,
  getOgSubject,
  type OgLogo,
  ogSubjectTags,
} from "@/server/modules/seo/queries"

// Generated share card (spec §10): white, the published site logo top-left,
// the eyebrow in brand, the title in navy-dark and a brand rule above the
// host in navy. Barlow 800 and Roboto 400 (assets/fonts, OFL). The hex
// constants equal --color-brand, --color-navy and --color-navy-dark in
// app/globals.css (tests/unit/seo/og-card.test.ts keeps them in step).
// Used when a record has no share image of its own.

const BRAND = "#11b1d1"
const NAVY = "#28648f"
const NAVY_DARK = "#1c3f5a"

let fonts: Promise<[Buffer, Buffer]> | null = null
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/roboto-latin-400-normal.woff")),
    readFile(join(process.cwd(), "assets/fonts/barlow-latin-800-normal.woff")),
  ]).catch((error: unknown) => {
    fonts = null // retry on the next request instead of caching the failure
    throw error
  })
  return fonts
}

/** Raster and SVG formats Satori can draw; anything else prints the site name. */
const DRAWABLE = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
])
const LOGO_HEIGHT = 72
const LOGO_MAX_WIDTH = 360

type LogoImage = { src: string; width: number; height: number }

/** The logo as a data URI, or null when it can't be read (the card prints the site name). */
async function loadLogo(logo: OgLogo | null): Promise<LogoImage | null> {
  if (!logo || !DRAWABLE.has(logo.mime)) return null
  try {
    let bytes: Uint8Array | null
    if (logo.driver === "static")
      bytes = await readFile(staticFilePath(logo.key))
    else bytes = (await (await storageFor(logo.driver))?.read(logo.key)) ?? null
    if (!bytes || bytes.length === 0) return null
    const ratio = logo.width && logo.height ? logo.width / logo.height : 3
    const width = Math.min(LOGO_MAX_WIDTH, Math.round(LOGO_HEIGHT * ratio))
    return {
      src: `data:${logo.mime};base64,${Buffer.from(bytes).toString("base64")}`,
      width,
      height: Math.round(width / ratio),
    }
  } catch {
    return null
  }
}

/**
 * The card as PNG bytes, or null when the record has no card. Cached per
 * (kind, id) with the subject's tags, so a publish, rename or settings
 * change re-renders it and repeat requests cost no rendering. Callers
 * check isOgSubjectId first (no cache entry for malformed ids).
 */
export async function renderOgCard(
  kind: OgKind,
  id: string
): Promise<Uint8Array<ArrayBuffer> | null> {
  "use cache"
  cacheLife("max")
  cacheTag(...ogSubjectTags(kind, id))
  const subject = await getOgSubject(kind, id)
  if (!subject) return null
  const ogLogo = await getOgLogo()
  if (ogLogo) cacheTag(tag.media(ogLogo.mediaId))
  const logo = await loadLogo(ogLogo)
  const card = ogCard({
    kind,
    title: subject.title,
    siteName: subject.siteName,
    origin: publicOrigin(subject.productionUrl),
  })
  const [regular, heavy] = await loadFonts()
  // Satori: every element with more than one child needs display:flex, so
  // each text is a single template-literal child.
  const image = new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "64px 80px 56px",
        background: "#ffffff",
        color: NAVY_DARK,
        fontFamily: "Roboto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", height: 80 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM
          <img src={logo.src} width={logo.width} height={logo.height} alt="" />
        ) : (
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow",
              fontSize: 44,
              fontWeight: 800,
              color: NAVY_DARK,
            }}
          >
            {`${card.siteName}`}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow",
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: BRAND,
          }}
        >
          {`${card.eyebrow}`}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow",
            fontSize: card.titleSize,
            fontWeight: 800,
            lineHeight: 1.1,
            color: NAVY_DARK,
          }}
        >
          {`${card.title}`}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 8,
            borderRadius: 4,
            background: BRAND,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 400,
            color: NAVY,
          }}
        >
          {`${card.host}`}
        </div>
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Roboto", data: regular, weight: 400, style: "normal" },
        { name: "Barlow", data: heavy, weight: 800, style: "normal" },
      ],
    }
  )
  return new Uint8Array(await image.arrayBuffer())
}
