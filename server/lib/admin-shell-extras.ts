import "server-only"

import type { NavBadges } from "@/lib/admin/nav"
import { hasPermission } from "@/lib/auth/permissions"
import type { AiStatusDto } from "@/lib/schemas/api/ai"
import type { ShellNotification } from "@/lib/schemas/api/dashboard"
import type { Actor } from "@/server/lib/actor"
import { getAiStatus } from "@/server/modules/ai/service"
import { unreadCount } from "@/server/modules/chat/repo"
import { getShellNotifications } from "@/server/modules/dashboard/service"
import { leadBadge } from "@/server/modules/leads/service"

export type ShellExtras = {
  badges: NavBadges
  notifications: ShellNotification[]
  /** undefined: the AI button stays hidden. */
  assistant: AiStatusDto | undefined
}

/**
 * The admin frame's optional parts (panel layout): the sidebar's new-leads
 * and unread-chats badges, the AI assistant status and the bell's items. Each degrades on its
 * own: a failing query is logged and leaves no badge, the AI button hidden
 * or an empty bell, instead of failing the whole frame.
 */
export async function loadShellExtras(actor: Actor): Promise<ShellExtras> {
  // Unassigned new leads for those who handle them; the bell reuses it.
  const badgesLoad: Promise<NavBadges> = hasPermission(actor.roles, {
    lead: ["read"],
  })
    ? leadBadge(actor)
        .then((badge): NavBadges => ({ "new-leads": badge.newLeads }))
        .catch(degraded("lead badge", {}))
    : Promise.resolve({})
  // Open chats with a visitor message nobody has read (live chat C12); the
  // sidebar polls it afterwards (useChatUnread).
  const chatLoad: Promise<NavBadges> = hasPermission(actor.roles, {
    chat: ["read"],
  })
    ? unreadCount()
        .then((count): NavBadges => ({ "chat-unread": count }))
        .catch(degraded("chat badge", {}))
    : Promise.resolve({})
  const [leadBadges, chatBadges, assistant, notifications] = await Promise.all([
    badgesLoad,
    chatLoad,
    getAiStatus(actor).catch(degraded("AI status", undefined)),
    badgesLoad
      .then((loaded) =>
        getShellNotifications(actor, loaded["new-leads"] ?? null)
      )
      .catch(degraded("notifications", [] as ShellNotification[])),
  ])
  return {
    badges: { ...leadBadges, ...chatBadges },
    assistant,
    notifications,
  }
}

/** A failed optional part: logged, then replaced by `fallback`. */
function degraded<T>(part: string, fallback: T) {
  return (error: unknown): T => {
    console.error(`[admin shell] ${part} unavailable`, error)
    return fallback
  }
}
