import { expect, type Page } from "@playwright/test"

import { visibleImagesLoaded } from "../e2e/media-pins"

/**
 * Every image in view has loaded and decoded (the sidebar logo is scaled
 * down from a large file: a half-decoded frame differs by a few pixels).
 */
export async function imagesSettled(page: Page) {
  await expect.poll(() => visibleImagesLoaded(page)).toBe(true)
  // Only the images in view: decode() on a lazy image below the fold would
  // make the browser fetch it.
  await page.evaluate(() =>
    Promise.all(
      [...document.images]
        .filter((img) => {
          const r = img.getBoundingClientRect()
          return (
            r.width > 0 &&
            r.bottom > 0 &&
            r.top < window.innerHeight &&
            getComputedStyle(img).visibility !== "hidden"
          )
        })
        .map((img) => img.decode().catch(() => {}))
    )
  )
  // The scaled sidebar logo is repainted a frame or two after it decodes.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
      )
  )
}
