import "server-only"

import type { GroupCompanyInput } from "@/lib/schemas/content/group-company"

import type { MediaLookup } from "./media"

/**
 * components/home/site-footer.tsx at 3689369, "Other services in the group".
 * Display order = sortOrder. The tel: href derives from `phone`. This row is
 * the one sanctioned mention of the sister company (branding gate).
 */
export function groupCompaniesFixture(media: MediaLookup): GroupCompanyInput[] {
  return [
    {
      name: "Security Partners",
      phone: "Tel: (085) 8591299",
      site: "www.securitypartnersltd.ie",
      logo: media("/images/home/security-partners.png"),
    },
    {
      name: "MJS Eco",
      phone: "Tel: 087 294 8880",
      site: "www.mjseco.ie",
      logo: media("/images/home/mjs-eco.png"),
    },
  ]
}
