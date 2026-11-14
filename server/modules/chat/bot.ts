import "server-only"

import type { ChatSettings } from "@/lib/schemas/settings/chat"

// Placeholder (live chat plan, Task 3). Task 5 replaces the bodies; the
// signatures are final.

/** Whether the AI assistant answers chats right now. */
export const isActive: (
  settings?: ChatSettings | null
) => Promise<boolean> = async () => false

/** Answers the chat's latest visitor message when the bot owns the chat. */
export const maybeReply: (
  conversationId: string
) => Promise<void> = async () => {}
