export type SitemapSource = {
  path: string
  lastModified: Date | null
  noindex: boolean
  /** The record's canonical override; listed only when it is this URL. */
  canonical: string | null
}
