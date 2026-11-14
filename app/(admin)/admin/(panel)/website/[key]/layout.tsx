import { Suspense } from "react"

import {
  WebsiteTabPanel,
  WebsiteTabs,
} from "@/components/admin/website/website-tabs"
import { isWebsiteKey, WEBSITE_SCREENS } from "@/lib/admin/website"

/**
 * The screen's tabs live in the layout so they stay mounted while the
 * user moves between the screen's Page and parts: only the page below
 * them suspends and streams in. The pages do the guarding (and 404s).
 */
export default function WebsiteScreenLayout({
  params,
  children,
}: LayoutProps<"/admin/website/[key]">) {
  return (
    <>
      <Suspense fallback={null}>
        <Tabs params={params} />
      </Suspense>
      <WebsiteTabPanel>{children}</WebsiteTabPanel>
    </>
  )
}

async function Tabs({
  params,
}: Pick<LayoutProps<"/admin/website/[key]">, "params">) {
  const { key } = await params
  const screen = WEBSITE_SCREENS.find((s) => s.key === key)
  if (!isWebsiteKey(key) || !screen || screen.kind !== "tabs") return null
  return <WebsiteTabs screen={screen.key} />
}
