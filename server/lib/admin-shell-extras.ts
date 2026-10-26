import "server-only"

import type { NavBadges } from "@/lib/admin/nav"
import type { ShellNotification } from "@/lib/schemas/api/dashboard"
import type { Actor } from "@/server/lib/actor"
import { getShellNotifications } from "@/server/modules/dashboard/service"

export type ShellExtras = {
  badges: NavBadges
  notifications: ShellNotification[]
}

/**
 * The admin frame's optional parts (panel layout): the sidebar's badges and
 * the bell's items. The lead badge arrives with the leads module (Phase 7):
 * until then there are no badges and the bell gets `newLeads` as null. The
 * bell degrades on its own (SP final review I7): a failing query is logged
 * and leaves an empty bell instead of failing the whole frame.
 */
export async function loadShellExtras(actor: Actor): Promise<ShellExtras> {
  const badges: NavBadges = {}
  const notifications = await getShellNotifications(
    actor,
    badges["new-leads"] ?? null
  ).catch((error: unknown): ShellNotification[] => {
    console.error("[admin shell] notifications unavailable", error)
    return []
  })
  return { badges, notifications }
}
