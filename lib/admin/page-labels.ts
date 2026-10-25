import type { PageKey } from "@/templates/registry"

/** Admin names of the seven fixed pages (sidebar, search, page list). */
export const PAGE_LABELS: Record<PageKey, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  blog: "Blog",
  contact: "Contact",
  privacy: "Privacy policy",
  terms: "Terms of use",
}
