"use client"

const networks = [
  {
    label: "f",
    name: "Facebook",
    url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  },
  {
    label: "in",
    name: "LinkedIn",
    url: (u: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  },
  {
    label: "X",
    name: "X",
    url: (u: string) => `https://x.com/intent/post?url=${u}`,
  },
]

export function ShareLinks() {
  return (
    <div className="flex items-center gap-2">
      <p className="font-heading text-base/[normal] font-bold text-ink">
        Share:
      </p>
      {networks.map((network) => (
        <button
          key={network.name}
          type="button"
          aria-label={`Share on ${network.name}`}
          onClick={() =>
            window.open(
              network.url(encodeURIComponent(window.location.href)),
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
