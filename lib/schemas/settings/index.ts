import { z } from "zod"

import { ThemeConfig } from "@/lib/theme/schema"

import { clientsSectionSettings } from "./sections-clients"
import { consentSettings } from "./consent"
import { contactSettings } from "./contact"
import { contactSectionSettings } from "./sections-contact"
import { customCodeSettings } from "./custom-code"
import { footerSettings } from "./footer"
import { howItWorksSettings } from "./sections-how-it-works"
import { leadsSettings } from "./leads"
import { mapSectionSettings } from "./sections-map"
import { microcopySettings } from "./microcopy"
import { navigationSettings } from "./navigation"
import { seoDefaultsSettings } from "./seo-defaults"
import { siteSettings } from "./site"
import { teamSectionSettings } from "./sections-team"
import { testimonialsSectionSettings } from "./sections-testimonials"
import { trackingSettings } from "./tracking"
import { whyChooseUsSettings } from "./sections-why-choose-us"

/** One Zod schema per content settings key (spec §5.4). Integrations live in lib/schemas/integrations (Phase 7). */
export const settingsSchemas = {
  site: siteSettings,
  contact: contactSettings,
  navigation: navigationSettings,
  footer: footerSettings,
  "sections.clients": clientsSectionSettings,
  "sections.whyChooseUs": whyChooseUsSettings,
  "sections.testimonials": testimonialsSectionSettings,
  "sections.team": teamSectionSettings,
  "sections.contact": contactSectionSettings,
  "sections.map": mapSectionSettings,
  "sections.howItWorks": howItWorksSettings,
  "seo.defaults": seoDefaultsSettings,
  consent: consentSettings,
  tracking: trackingSettings,
  customCode: customCodeSettings,
  microcopy: microcopySettings,
  leads: leadsSettings,
  // Appearance (lib/theme): edited only through /api/v1/admin/appearance,
  // never public/editable here.
  theme: ThemeConfig,
} as const

export type SettingsKey = keyof typeof settingsSchemas
export const SETTINGS_KEYS = Object.keys(settingsSchemas) as SettingsKey[]
export type SettingsValue<K extends SettingsKey> = z.infer<
  (typeof settingsSchemas)[K]
>

/** Keys the public site reads on every page (header, footer, shared sections). */
export const PUBLIC_SETTINGS_KEYS = [
  "site",
  "contact",
  "navigation",
  "footer",
  "sections.clients",
  "sections.whyChooseUs",
  "sections.testimonials",
  "sections.team",
  "sections.contact",
  "sections.map",
  "sections.howItWorks",
  "seo.defaults",
  "microcopy",
] as const satisfies readonly SettingsKey[]
export type PublicSettingsKey = (typeof PUBLIC_SETTINGS_KEYS)[number]

export function isSettingsKey(value: string): value is SettingsKey {
  return Object.hasOwn(settingsSchemas, value)
}
