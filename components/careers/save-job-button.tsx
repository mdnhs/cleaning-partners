"use client"

import { Bookmark, BookmarkCheck } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const STORAGE_KEY = "cp:saved-jobs"

function readSaved(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(value)
      ? value.filter((v) => typeof v === "string")
      : []
  } catch {
    return []
  }
}

function writeSaved(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // Private mode or blocked storage: the button still shows the state.
  }
}

/**
 * "Save Job": remembers the job in this browser only (no account), so the
 * visitor can come back to it. Works, without persisting, when storage is
 * blocked.
 */
export function SaveJobButton({
  slug,
  label,
  savedLabel,
  className,
}: {
  slug: string
  label: string
  savedLabel: string
  className?: string
}) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    // Storage exists only in the browser: read once after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSaved().includes(slug))
  }, [slug])
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        const next = !saved
        const others = readSaved().filter((s) => s !== slug)
        writeSaved(next ? [...others, slug] : others)
        setSaved(next)
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-white/70 px-7 py-3.5 font-heading text-base/[normal] font-bold text-white transition-colors hover:bg-white/10 aria-pressed:bg-white/15",
        className
      )}
    >
      <Icon aria-hidden className="size-4 max-sm:size-5" />
      <span className="max-sm:sr-only">{saved ? savedLabel : label}</span>
    </button>
  )
}
