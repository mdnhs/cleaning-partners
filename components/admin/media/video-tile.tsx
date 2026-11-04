import { cn } from "@/lib/utils"

/**
 * Thumbnail of a video in the admin (library, picker, details): its first
 * frame, never played (metadata only), so the grid stays light.
 */
export function VideoTile({
  url,
  className,
}: {
  url: string
  className?: string
}) {
  return (
    <video
      data-video-tile
      aria-hidden
      tabIndex={-1}
      muted
      playsInline
      preload="metadata"
      // #t=0.1 asks for a frame just after the start (some files open on black).
      src={`${url}#t=0.1`}
      className={cn("size-full object-cover", className)}
    />
  )
}
