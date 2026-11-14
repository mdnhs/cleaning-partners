import "server-only"

import * as bot from "@/server/modules/chat/bot"
import { notifyNoReply } from "@/server/modules/chat/notify"
import { readChatSettings } from "@/server/modules/chat/settings"
import { sweepChats } from "@/server/modules/chat/sweep"

import type { JobDefinition } from "./index"

/** Stalled bot chats answered per run; the rest wait for the next minute. */
const MAX_RESUMES = 5

/**
 * Live chat tick (C6): 24 h auto-close, 5 min no-reply alert, 90 s bot resume.
 * Outside a request there is no after(), so the bot runs are awaited here.
 */
export const chatSweepJob: JobDefinition = {
  name: "chat-sweep",
  key: "chat-sweep",
  everyMs: 60_000,
  async run() {
    const settings = await readChatSettings()
    if (!settings?.enabled) return {}
    const botActive = await bot.isActive(settings)
    const { alerted, resume } = await sweepChats({ botActive })
    for (const id of alerted) await notifyNoReply(id)
    if (botActive) {
      await Promise.allSettled(
        resume.slice(0, MAX_RESUMES).map((id) => bot.maybeReply(id))
      )
    }
    return {}
  },
}
