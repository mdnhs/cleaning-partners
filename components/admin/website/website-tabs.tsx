"use client"

import { MotionConfig } from "motion/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode, useEffect, useId, useRef } from "react"

import {
  SECTION_TAB,
  SECTION_TAB_ACTIVE,
} from "@/components/admin/section-tabs/section-tabs"
import { useAdminSession } from "@/components/admin/session-provider"
import {
  ActivePill,
  PANEL_ENTER,
  useClickedCurrent,
} from "@/components/admin/shell/active-indicator"
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
  const listRef = useRef<HTMLUListElement>(null)
  // The deepest tab whose href covers the path (Page covers its parts).
  const routed = tabs
    .filter((tab) => covers(tab.href, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id
  const [current, mark] = useClickedCurrent(routed, pathname)
  // On a narrow screen the row scrolls: keep the current tab in view (a
  // deep link to the last part), as SectionTabs does. Only the row scrolls.
  useEffect(() => {
    const row = listRef.current
    const active = row?.querySelector<HTMLElement>("[aria-current=page]")
    if (!row || !active || row.scrollWidth <= row.clientWidth) return
    const left = active.offsetLeft
    const right = left + active.offsetWidth
    if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth)
      row.scrollTo({ left: left - 16 })
  }, [current])
  if (tabs.length < 2) return null
  const label = WEBSITE_SCREENS.find((s) => s.key === screen)!.label
  return (
    <nav
      aria-label={`${label} sections`}
      className="mb-4 min-w-0 lg:mb-(--main-pad)"
    >
      <MotionConfig reducedMotion="user">
        <ul
          ref={listRef}
          className="relative -mx-1 flex scrollbar-thin gap-1 overflow-x-auto px-1 pb-1"
        >
          {tabs.map((tab) => {
            const active = tab.id === current
            return (
              <li key={tab.id} className="flex shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  onClick={mark(tab.id)}
                  className={cn(
                    SECTION_TAB,
                    // The pill below carries the active background.
                    active && SECTION_TAB_ACTIVE,
                    active && "bg-transparent"
                  )}
                >
                  {active ? (
                    <ActivePill layoutId={`website-tab-${screen}`} />
                  ) : null}
                  <span className="relative">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </MotionConfig>
    </nav>
  )
}

/**
 * The screen's page below its tabs: fades and rises in on each tab change
 * (keyed by path), still for reduced motion.
 */
export function WebsiteTabPanel({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className={PANEL_ENTER}>
      {children}
    </div>
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
      className="rounded-card mb-4 border border-border p-4 lg:mb-(--main-pad)"
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
