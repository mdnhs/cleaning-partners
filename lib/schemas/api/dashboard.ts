/** One item in the topbar bell (panel layout, server). */
export type ShellNotification = {
  id: "new-leads" | "failed-jobs" | "turnstile-unreadable"
  title: string
  description: string
  /** Where the item is fixed. */
  href: string
}
