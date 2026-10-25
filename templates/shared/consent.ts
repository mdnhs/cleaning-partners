import { interpolate, type Placeholders } from "@/lib/interpolate"
import type { Link } from "@/lib/schemas/common"
import {
  type ConsentSettings,
  DEFAULT_CLOSE_LABEL,
  DEFAULT_CONSENT_VERSION,
  DEFAULT_RECONSENT_MONTHS,
} from "@/lib/schemas/settings/consent"

type CategoryCopy = { label: string; description: string }

/** What the consent banner renders (the banner component itself is Phase 8). */
export type ConsentBannerCopy = {
  title: string
  body: string
  acceptLabel: string
  rejectLabel: string
  customiseLabel: string
  saveLabel: string
  manageLabel: string
  closeLabel: string
  policyLink: Link
  categories: {
    necessary: CategoryCopy
    analytics: CategoryCopy
    marketing: CategoryCopy
  }
  version: number
  reconsentMonths: number
}

/**
 * Banner copy with {placeholders} filled. The policy link goes through
 * `resolveHref` (the view layer's placeholder-and-safety check on hrefs).
 */
export function consentBannerCopy(
  consent: ConsentSettings,
  values: Placeholders,
  resolveHref: (href: string) => string
): ConsentBannerCopy {
  const t = (text: string) => interpolate(text, values)
  const category = (c: CategoryCopy) => ({
    label: t(c.label),
    description: t(c.description),
  })
  return {
    title: t(consent.title),
    body: t(consent.body),
    acceptLabel: t(consent.acceptLabel),
    rejectLabel: t(consent.rejectLabel),
    customiseLabel: t(consent.customiseLabel),
    saveLabel: t(consent.saveLabel),
    manageLabel: t(consent.manageLabel),
    // Public reads are not re-parsed: a value stored before closeLabel
    // existed has none, so the schema default applies here too.
    closeLabel: t(consent.closeLabel || DEFAULT_CLOSE_LABEL),
    policyLink: {
      label: consent.policyLink.label,
      href: resolveHref(consent.policyLink.href),
    },
    categories: {
      necessary: category(consent.categories.necessary),
      analytics: category(consent.categories.analytics),
      marketing: category(consent.categories.marketing),
    },
    version: consent.version ?? DEFAULT_CONSENT_VERSION,
    reconsentMonths: consent.reconsentMonths ?? DEFAULT_RECONSENT_MONTHS,
  }
}
