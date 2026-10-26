import "server-only"

import type { NavBadges } from "@/lib/admin/nav"
import { hasPermission } from "@/lib/auth/permissions"
import type { ShellNotification } from "@/lib/schemas/api/dashboard"
import type { Actor } from "@/server/lib/actor"
import { getShellNotifications } from "@/server/modules/dashboard/service"
import { leadBadge } from "@/server/modules/leads/service"

export type ShellExtras = {
  badges: NavBadges
  notifications: ShellNotification[]
  // 9.3: re-add `assistant: AiStatusDto | undefined` (the AI button status).
}

/**
 * The admin frame's optional parts (panel layout): the sidebar's new-leads
 * badge and the bell's items. Each degrades on its own (SP final review
 * I7): a failing query is logged and leaves no badge or an empty bell,
 * instead of failing the whole frame. The AI assistant status returns with
 * the assistant (9.3).
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
  // 9.3: add getAiStatus(actor).catch(degraded("AI status", undefined)) here.
  const [badges, notifications] = await Promise.all([
    badgesLoad,
    badgesLoad
      .then((loaded) =>
        getShellNotifications(actor, loaded["new-leads"] ?? null)
      )
      .catch(degraded("notifications", [] as ShellNotification[])),
  ])
  return { badges, notifications }
}

/** A failed optional part: logged, then replaced by `fallback`. */
function degraded<T>(part: string, fallback: T) {
  return (error: unknown): T => {
    console.error(`[admin shell] ${part} unavailable`, error)
    return fallback
  }
}
