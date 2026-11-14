import { draftMode } from "next/headers"
import { unstable_rethrow } from "next/navigation"
import { connection } from "next/server"

import { chatLauncherProps } from "@/lib/chat/text"
import { getPublishedSettings } from "@/server/modules/settings/queries"

import { ChatLauncher } from "./chat-launcher"

/**
 * The live chat launcher, site-wide. Renders inside the root layout's
 * <Suspense> beside SiteExtras, so it shares the brand overrides. Off unless
 * the published chat settings say so: an unpublished, invalid or unreadable
 * value, and draft mode (admin previews), all render nothing, so no widget
 * markup or JavaScript reaches the page.
 */
export async function ChatSlot() {
  await connection()
  if ((await draftMode()).isEnabled) return null
  const [chatRead, contactRead] = await Promise.allSettled([
    getPublishedSettings("chat"),
    getPublishedSettings("contact"),
  ])
  for (const result of [chatRead, contactRead])
    if (result.status === "rejected") unstable_rethrow(result.reason)
  const chat = chatRead.status === "fulfilled" ? chatRead.value : null
  const contact = contactRead.status === "fulfilled" ? contactRead.value : null
  if (!chat?.enabled || !contact) return null
  return <ChatLauncher {...chatLauncherProps(chat, contact)} />
}
