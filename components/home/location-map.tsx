import Image from "next/image"

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
}: {
  tiles: [number, number][]
  offset: number
  columns: number
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
          src={`/images/home/tiles/tile-${i + offset}.png`}
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

export function LocationMap() {
  return (
    <section
      aria-label="Map showing Cleaning Partners in Mountmellick, Co. Laois"
      data-map
      className="relative h-[480px] overflow-hidden bg-[#e8eae6]"
    >
      <div data-map-tiles className="absolute inset-0">
        <TileLayer tiles={baseTiles} offset={0} columns={7} />
        <div className="absolute inset-0 bg-[rgba(17,177,209,0.06)]" />
        <TileLayer tiles={overlayTiles} offset={baseTiles.length} columns={9} />
      </div>

      <a
        href="https://www.google.com/maps/search/?api=1&query=Derryguile%2C+Mountmellick%2C+Co.+Laois%2C+R32+YX49"
        target="_blank"
        rel="noreferrer"
        data-map-marker
        className="absolute top-[calc(50%-17px)] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      >
        <div className="flex items-center gap-2.5 rounded-full bg-white py-2 pr-4 pl-2 shadow-[0px_6px_18px_0px_rgba(0,0,0,0.18)]">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-brand/25 bg-white">
            <Image
              src="/images/home/logo.png"
              alt=""
              width={32}
              height={32}
              className="absolute top-px left-px size-8 object-contain"
            />
          </div>
          <p className="font-heading text-base font-bold whitespace-nowrap text-ink">
            Cleaning Partners Ltd.
          </p>
        </div>
        <Image src="/images/home/map-pin.svg" alt="" width={120} height={96} />
      </a>
    </section>
  )
}
