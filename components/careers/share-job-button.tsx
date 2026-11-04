"use client"

import { Share2 } from "lucide-react"
import { useState } from "react"

/**
 * "Share this job": the device's share sheet when there is one, else the
 * link is copied (and the label says so for a moment).
 */
export function ShareJobButton({
  label,
  copiedLabel,
  title,
}: {
  label: string
  copiedLabel: string
  title: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href
        try {
          if (navigator.share) {
            await navigator.share({ title, url })
            return
          }
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        } catch {
          // Cancelled share sheet or no clipboard access: nothing to do.
        }
      }}
      className="inline-flex items-center justify-center gap-2 self-center font-heading text-[15px] font-semibold text-navy hover:text-brand"
    >
      <Share2 aria-hidden className="size-4" />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  )
}
