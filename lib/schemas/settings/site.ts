import { z } from "zod"

import { httpUrl, mediaRef, text } from "../common"

/** settings.site — brand and locale (spec §5.4, D7). */
export const siteSettings = z.object({
  name: text,
  legalName: text,
  logo: mediaRef,
  logoAlt: text,
  /** The larger logo of the home hero and the article page. */
  logoLarge: mediaRef,
  /** Hero image of an inner page that does not pick its own. */
  defaultHeroImage: mediaRef,
  logoOnDark: mediaRef.nullable(),
  /**
   * Lottie animation (JSON or dotLottie) played in a loop in place of the
   * logo in the header and footer; null = the image logo only. Saved values
   * from before this field read as null.
   */
  logoAnimation: mediaRef.nullable().default(null),
  favicon: mediaRef.nullable(),
  productionUrl: httpUrl.nullable(),
  timezone: text,
  /** <html lang> of the public site. */
  locale: text,
})
export type SiteSettings = z.infer<typeof siteSettings>
