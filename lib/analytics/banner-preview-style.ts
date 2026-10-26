// The public site's brand colours as CSS custom properties, for the admin's
// consent-banner preview: the admin stylesheet never reads the public tokens,
// so the preview's frame sets them itself. Derived from CP_SITE
// (lib/theme/presets.ts, verbatim from app/globals.css @theme;
// tests/unit/analytics/banner-preview-style.test.ts keeps them equal).
import { CP_SITE } from "@/lib/theme/presets"
import type { SiteToken } from "@/lib/theme/tokens"

export const BANNER_PREVIEW_STYLE = Object.fromEntries(
  (Object.entries(CP_SITE) as [SiteToken, string][]).map(([token, value]) => [
    `--color-${token}`,
    value,
  ])
) as Readonly<Record<`--color-${SiteToken}`, string>>
