"use client"

import { interpolate, shareHref } from "@/lib/interpolate"

export type ShareLinksProps = {
  label: string
  /** Accessible name template; {network} is the network's name */
  aria: string
  /** The article's title, for {title} in a network's address template */
  title: string
  networks: {
    label: string
    name: string
    /** Address template; {url} (and {title}) are filled in encoded */
    url: string
  }[]
}

export function ShareLinks({ label, aria, title, networks }: ShareLinksProps) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-heading text-base/[normal] font-bold text-ink">
        {label}
      </p>
      {networks.map((network) => (
        <button
          key={network.name}
          type="button"
          aria-label={interpolate(aria, { network: network.name })}
          onClick={() =>
            window.open(
              shareHref(network.url, { url: window.location.href, title }),
              "_blank",
              "noopener,noreferrer,width=600,height=540"
            )
          }
          className="flex size-10 items-center justify-center rounded-full bg-navy font-heading text-base/[normal] font-bold text-white transition-colors hover:bg-brand"
        >
          {network.label}
        </button>
      ))}
    </div>
  )
}
