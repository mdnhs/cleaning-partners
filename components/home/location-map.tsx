import Image from "next/image"

import { interpolate } from "@/lib/interpolate"

const TILE = 256

// [column, row] of each 256px tile, indexed by its file number.
const baseTiles: [number, number][] = [
  [2, 0],
  [2, 1],
  [3, 1],
  [4, 1],
  [3, 0],
  [0, 1],
  [5, 1],
  [1, 1],
  [1, 0],
  [5, 0],
  [6, 0],
  [4, 0],
  [6, 1],
  [0, 0],
]

const overlayTiles: [number, number][] = [
  [1, 0],
  [6, 1],
  [1, 1],
  [3, 0],
  [3, 1],
  [4, 0],
  [4, 1],
  [7, 1],
  [8, 1],
  [8, 0],
  [7, 0],
  [2, 0],
  [5, 0],
  [2, 1],
  [6, 0],
  [0, 0],
  [0, 1],
  [5, 1],
]

function TileLayer({
  tiles,
  offset,
  columns,
  pattern,
}: {
  tiles: [number, number][]
  offset: number
  columns: number
  pattern: string
}) {
  return (
    <div
      aria-hidden
      className="absolute top-[calc(50%+5px)] left-[calc(50%+8.5px)] h-[512px] -translate-x-1/2 -translate-y-1/2"
      style={{ width: columns * TILE }}
    >
      {tiles.map(([col, row], i) => (
        <Image
          key={i}
          src={interpolate(pattern, { index: i + offset })}
          alt=""
          width={TILE}
          height={TILE}
          className="absolute size-64 object-cover"
          style={{ left: col * TILE, top: row * TILE }}
        />
      ))}
    </div>
  )
}

export type LocationMapProps = {
  ariaLabel: string
  /** Tile URL template; {index} is the tile number (0–31) */
  tilePattern: string
  href: string
  markerLabel: string
  logo: string
  pin: string
}

export function LocationMap({
  ariaLabel,
  tilePattern,
  href,
  markerLabel,
  logo,
  pin,
}: LocationMapProps) {
  return (
    <section
      aria-label={ariaLabel}
      data-map
      className="relative h-[480px] overflow-hidden bg-[#e8eae6]"
    >
      <div data-map-tiles className="absolute inset-0">
        <TileLayer
          tiles={baseTiles}
          offset={0}
          columns={7}
          pattern={tilePattern}
        />
        <div className="absolute inset-0 bg-[rgba(17,177,209,0.06)]" />
        <TileLayer
          tiles={overlayTiles}
          offset={baseTiles.length}
          columns={9}
          pattern={tilePattern}
        />
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        data-map-marker
        className="absolute top-[calc(50%-17px)] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      >
        <div className="flex items-center gap-2.5 rounded-full bg-white py-2 pr-4 pl-2 shadow-[0px_6px_18px_0px_rgba(0,0,0,0.18)]">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-brand/25 bg-white">
            <Image
              src={logo}
              alt=""
              width={32}
              height={32}
              className="absolute top-px left-px size-8 object-contain"
            />
          </div>
          <p className="font-heading text-base font-bold whitespace-nowrap text-ink">
            {markerLabel}
          </p>
        </div>
        <Image src={pin} alt="" width={120} height={96} />
      </a>
    </section>
  )
}
