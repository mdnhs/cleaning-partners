"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

import { CollectionScreen } from "@/components/admin/collections/collection-screen"
import { FormCard } from "@/components/admin/form/form-ui"
import { SettingsEditor } from "@/components/admin/settings/settings-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type HeaderFooterTab = "header" | "footer"

/**
 * Header & footer: two tabs, each the whole of its part of the site chrome.
 * Header: the menu links (with dropdowns), the button and the phone menu.
 * Footer: its text, quick links switches, and the group companies list; the
 * forms & microcopy strings sit one link away.
 */
export function HeaderFooterEditor({
  initial,
  tabs,
  canMicrocopy,
}: {
  initial: HeaderFooterTab
  /** The tabs the user may open. */
  tabs: readonly HeaderFooterTab[]
  canMicrocopy: boolean
}) {
  const [tab, setTab] = useState<HeaderFooterTab>(initial)
  const change = useCallback((value: unknown) => {
    const next = value === "footer" ? "footer" : "header"
    setTab(next)
    // Keep the choice in the address (a reload or a shared link opens it).
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    window.history.replaceState(window.history.state, "", url)
  }, [])
  return (
    <Tabs value={tab} onValueChange={change} className="gap-4">
      <TabsList aria-label="Header and footer">
        {tabs.includes("header") ? (
          <TabsTrigger value="header">Header</TabsTrigger>
        ) : null}
        {tabs.includes("footer") ? (
          <TabsTrigger value="footer">Footer</TabsTrigger>
        ) : null}
      </TabsList>
      <TabsContent value="header">
        <SettingsEditor settingsKey="navigation" />
      </TabsContent>
      <TabsContent value="footer" className="flex flex-col gap-6">
        <SettingsEditor settingsKey="footer" />
        <FormCard id="part-group-companies">
          <CollectionScreen name="group-companies" compact />
        </FormCard>
        {canMicrocopy ? (
          <FormCard
            id="part-microcopy"
            title="Forms & microcopy"
            description="The labels, messages and small texts used across the site."
          >
            <Link
              href="/admin/website/header-footer/microcopy"
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Open forms &amp; microcopy
            </Link>
          </FormCard>
        ) : null}
      </TabsContent>
    </Tabs>
  )
}
