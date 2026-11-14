"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId } from "react"

import {
  SECTION_TAB,
  SECTION_TAB_ACTIVE,
} from "@/components/admin/section-tabs/section-tabs"
import { useAdminSession } from "@/components/admin/session-provider"
import {
  sharedOnPage,
  WEBSITE_SCREENS,
  type WebsiteKey,
  websiteTabs,
} from "@/lib/admin/website"
import { cn } from "@/lib/utils"
import type { PageKey } from "@/templates/registry"

const covers = (href: string, pathname: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

/**
 * A Website screen's tabs: its Page, then the parts homed on it that the
 * user may read (lib/admin/website.ts). Nothing when there is only one.
 */
export function WebsiteTabs({ screen }: { screen: WebsiteKey }) {
  const { roles } = useAdminSession()
  const pathname = usePathname()
  const tabs = websiteTabs(screen, roles)
  if (tabs.length < 2) return null
  const label = WEBSITE_SCREENS.find((s) => s.key === screen)!.label
  // The deepest tab whose href covers the path (Page covers its parts).
  const current = tabs
    .filter((tab) => covers(tab.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id
  return (
    <nav aria-label={`${label} sections`} className="mb-4 min-w-0">
      <ul className="-mx-1 flex scrollbar-thin gap-1 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const active = tab.id === current
          return (
            <li key={tab.id} className="flex shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(SECTION_TAB, active && SECTION_TAB_ACTIVE)}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Parts this page shows that are edited on another Website screen. */
export function SharedOnPage({ page }: { page: PageKey }) {
  const { roles } = useAdminSession()
  const headingId = useId()
  const shared = sharedOnPage(page, roles)
  if (shared.length === 0) return null
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-card mb-4 border border-border p-4"
    >
      <h2 id={headingId} className="text-sm font-semibold">
        Shared on this page
      </h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {shared.map((part) => (
          <li key={part.id}>
            <Link
              href={part.href}
              className="underline-offset-4 hover:underline"
            >
              {part.label}{" "}
              <span className="text-muted-foreground">
                · edited on {part.screenLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
