import { APICallError } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { eq } from "drizzle-orm"
import type { ReactElement } from "react"
import { render } from "react-email"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest"

const deferred = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }))
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => {
    deferred.tasks.push(Promise.resolve().then(task))
  },
}))

vi.mock("@/server/modules/ai/providers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/modules/ai/providers")>()
  return { ...actual, createLanguageModel: vi.fn() }
})

import { CHAT_SETTINGS_DEFAULT } from "@/lib/chat/defaults"
import { fillChatText } from "@/lib/chat/text"
import { app } from "@/server/api/app"
import { getDb } from "@/server/db/client"
import { chatConversations, chatMessages, settings } from "@/server/db/schema"
import { encryptSecret } from "@/server/lib/crypto"
import { mailer } from "@/server/lib/mailer"
import { createLanguageModel } from "@/server/modules/ai/providers"
import * as bot from "@/server/modules/chat/bot"
import { clearKnowledgeCache } from "@/server/modules/chat/knowledge"
import * as repo from "@/server/modules/chat/repo"

import { resetDb } from "../db"
import { createUser, ORIGIN } from "../helpers/auth"

const API_KEY = "sk-ant-test-key-4321"
const TEAM = CHAT_SETTINGS_DEFAULT.teamName
const NEEDS_PERSON = "A visitor on the chat needs a person"

async function put(key: string, draft: unknown, published: unknown = draft) {
  await getDb()
    .insert(settings)
    .values({ key, draft, published, version: 1 })
    .onConflictDoUpdate({ target: settings.key, set: { draft, published } })
}

function publishChat(
  patch: Record<string, unknown> = {},
  botPatch: Record<string, unknown> = {}
) {
  return put("chat", {
    ...CHAT_SETTINGS_DEFAULT,
    enabled: true,
    ...patch,
    bot: { ...CHAT_SETTINGS_DEFAULT.bot, enabled: true, ...botPatch },
  })
}

/** integrations.ai is read from its draft, with the key sealed as the save does. */
function saveAi(values: Record<string, unknown> = {}) {
  const apiKey = (values.apiKey as string | undefined) ?? API_KEY
  return put(
    "integrations.ai",
    {
      enabled: true,
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      allowedRoles: ["owner"],
      ...values,
      apiKey: apiKey ? encryptSecret(apiKey, "integrations.ai.apiKey") : "",
    },
    null
  )
}

// ---------- the scripted model ----------

type CallOptions = Parameters<MockLanguageModelV4["doGenerate"]>[0]

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}

let calls = 0
let prompts: string[] = []
let options: CallOptions[] = []

function model(
  opts: {
    onCall?: (n: number) => void | Promise<void>
    handoff?: boolean
    fail?: boolean
  } = {}
) {
  return new MockLanguageModelV4({
    doGenerate: async (call) => {
      calls += 1
      const n = calls
      const raw = JSON.stringify(call.prompt)
      prompts.push(raw)
      options.push(call)
      await opts.onCall?.(n)
      if (opts.fail)
        throw new APICallError({
          message: `provider down: ${API_KEY} What do you offer?`,
          url: "https://api.anthropic.com/v1/messages",
          requestBodyValues: {},
          statusCode: 503,
          isRetryable: false,
        })
      const toolStep = opts.handoff && !raw.includes("tool-result")
      return {
        content: toolStep
          ? [
              { type: "text" as const, text: "Let me get the team." },
              {
                type: "tool-call" as const,
                toolCallId: "t1",
                toolName: "handoffToHuman",
                input: JSON.stringify({ reason: "quote" }),
              },
            ]
          : [{ type: "text" as const, text: `Reply ${n}` }],
        finishReason: {
          unified: toolStep ? ("tool-calls" as const) : ("stop" as const),
          raw: undefined,
        },
        usage,
        warnings: [],
      }
    },
  })
}

function useModel(m: MockLanguageModelV4) {
  vi.mocked(createLanguageModel).mockImplementation(() => m)
}

// ---------- chats ----------

let n = 0
async function start(first = "What do you offer?") {
  n += 1
  const { chat } = await repo.createConversation({
    tokenHash: `bot-hash-${n}`,
    visitorName: "Visitor",
    sourcePath: "/services",
    firstMessage: first,
  })
  return chat.id
}

const say = (id: string, body: string) =>
  repo.addMessage({
    conversationId: id,
    sender: "visitor",
    senderName: "Visitor",
    body,
  })

const rows = (id: string) =>
  getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(chatMessages.id)
const aiRows = async (id: string) =>
  (await rows(id)).filter((m) => m.sender === "ai")
const notices = async (id: string) =>
  (await rows(id)).filter((m) => m.noticeKind).map((m) => m.noticeKind)
const chatOf = async (id: string) => (await repo.findById(id))!

let sendSpy: MockInstance<typeof mailer.send>
const subjects = () => sendSpy.mock.calls.map(([m]) => m.subject)
const alertText = (i = 0) =>
  render(sendSpy.mock.calls[i]![0].react as ReactElement, { plainText: true })

beforeEach(async () => {
  await resetDb()
  clearKnowledgeCache()
  deferred.tasks = []
  calls = 0
  prompts = []
  options = []
  await publishChat()
  await saveAi()
  await put("leads", {
    recipients: ["team@example.ie"],
    retentionMonths: 24,
    acknowledgement: false,
  })
  vi.mocked(createLanguageModel).mockReset()
  useModel(model())
  sendSpy = vi.spyOn(mailer, "send").mockResolvedValue({ delivered: true })
})

afterEach(async () => {
  await Promise.allSettled(deferred.tasks)
  vi.restoreAllMocks()
})

describe("chat bot", () => {
  it("replies as the AI with the bot name and increments ai_reply_count", async () => {
    await publishChat({}, { name: "Ciara" })
    await saveAi({ maxOutputTokens: 200 })
    const id = await start()
    await bot.maybeReply(id)

    const ai = await aiRows(id)
    expect(ai).toHaveLength(1)
    expect(ai[0]).toMatchObject({ senderName: "Ciara", body: "Reply 1" })
    const chat = await chatOf(id)
    expect(chat.aiReplyCount).toBe(1)
    expect(chat.aiLeaseUntil).toBeNull()
    expect(calls).toBe(1)
    expect(options[0]!.maxOutputTokens).toBe(200)
    expect(prompts[0]).toContain("You are Ciara")
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it("caps maxOutputTokens at 300", async () => {
    await saveAi({ maxOutputTokens: 4000 })
    await bot.maybeReply(await start())
    expect(options[0]!.maxOutputTokens).toBe(300)
  })

  it("a staff takeover during generation drops the reply", async () => {
    const staff = await createUser({ roles: ["owner"] })
    const id = await start()
    useModel(
      model({
        onCall: async () => {
          await repo.assign(id, staff.id)
        },
      })
    )
    await bot.maybeReply(id)

    expect(calls).toBe(1)
    expect(await aiRows(id)).toHaveLength(0)
    expect(await notices(id)).toEqual([])
    expect((await chatOf(id)).aiReplyCount).toBe(0)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it("provider error → one failed notice, needs_human, one alert; a second run makes no provider call", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const id = await start()
    useModel(model({ fail: true }))
    await bot.maybeReply(id)

    expect(await notices(id)).toEqual(["failed"])
    const notice = (await rows(id)).find((m) => m.noticeKind === "failed")!
    expect(notice).toMatchObject({
      sender: "system",
      body: fillChatText(CHAT_SETTINGS_DEFAULT.notices.failed, { team: TEAM }),
    })
    expect((await chatOf(id)).needsHuman).toBe(true)
    expect(subjects()).toEqual([NEEDS_PERSON])
    expect(await alertText()).toContain(
      "The assistant was unavailable for this chat."
    )
    const logged = JSON.stringify(log.mock.calls)
    expect(logged).not.toContain("What do you offer?")
    expect(logged).not.toContain(API_KEY)

    await say(id, "Hello?")
    await bot.maybeReply(id)
    expect(calls).toBe(1)
    expect(await notices(id)).toEqual(["failed"])
    expect(sendSpy).toHaveBeenCalledTimes(1)
  })

  it("maxAiReplies reached → limit notice once, no provider call", async () => {
    await publishChat({}, { maxAiReplies: 2 })
    const id = await start()
    await getDb()
      .update(chatConversations)
      .set({ aiReplyCount: 2 })
      .where(eq(chatConversations.id, id))
    await bot.maybeReply(id)
    await say(id, "Still there?")
    await bot.maybeReply(id)

    expect(calls).toBe(0)
    expect(await notices(id)).toEqual(["limit"])
    expect((await chatOf(id)).needsHuman).toBe(true)
    expect(subjects()).toEqual([NEEDS_PERSON])
    expect(await alertText()).toContain(
      "The assistant reached its reply limit for this chat."
    )
  })

  it("messages sent during generation are all answered, with no double reply", async () => {
    const id = await start("First question")
    let concurrentCalls = -1
    useModel(
      model({
        onCall: async (call) => {
          if (call === 1) {
            await say(id, "Second question")
            // A second run while this one holds the lease does nothing.
            const before = calls
            await bot.maybeReply(id)
            concurrentCalls = calls - before
          }
          if (call === 2) await say(id, "Third question")
        },
      })
    )
    await bot.maybeReply(id)

    expect(concurrentCalls).toBe(0)
    expect(calls).toBe(3)
    const all = await rows(id)
    expect(all.map((m) => [m.sender, m.body])).toEqual([
      ["visitor", "First question"],
      ["visitor", "Second question"],
      ["ai", "Reply 1"],
      ["visitor", "Third question"],
      ["ai", "Reply 2"],
      ["ai", "Reply 3"],
    ])
    // Each later round ends with the visitor turn it answers.
    const last = (raw: string) => JSON.stringify(JSON.parse(raw).at(-1))
    expect(last(prompts[1]!)).toContain("Second question")
    expect(last(prompts[2]!)).toContain("Third question")
    expect((await chatOf(id)).aiReplyCount).toBe(3)

    await bot.maybeReply(id)
    expect(calls).toBe(3)
    expect(await aiRows(id)).toHaveLength(3)
  })

  it("tool call handoffToHuman → reply stored then one handoff notice and one alert whose subject is 'A visitor on the chat needs a person'", async () => {
    const id = await start("Can I get a quote for an office?")
    useModel(model({ handoff: true }))
    await bot.maybeReply(id)

    const all = await rows(id)
    expect(all.map((m) => m.sender)).toEqual(["visitor", "ai", "system"])
    expect(all[2]).toMatchObject({
      noticeKind: "handoff",
      body: fillChatText(CHAT_SETTINGS_DEFAULT.notices.handoff, { team: TEAM }),
    })
    expect((await chatOf(id)).needsHuman).toBe(true)
    expect(subjects()).toEqual([NEEDS_PERSON])
    const text = await alertText()
    expect(text).toContain("A visitor is on the chat.")
    expect(text).toContain("The assistant asked for a person to take over.")
    expect(text).toContain("Message: Can I get a quote for an office?")
    expect(text).toContain(`/admin/chat?c=${id}`)
    expect(sendSpy.mock.calls[0]![0]).toMatchObject({
      to: ["team@example.ie"],
      template: "chat-alert",
    })
    const tools = options[0]!.tools as { name: string; description?: string }[]
    expect(tools.map((t) => t.name)).toEqual(["handoffToHuman"])
    expect(tools[0]!.description).toBe(
      "Ask a person from the team to take over this chat. Use when the visitor asks for a quote, a booking, a specific price, a site visit or a person, or when the answer is not in KNOWLEDGE."
    )

    // A second handoff in the same chat neither repeats the notice nor emails.
    await bot.handOff(id, "handoff")
    expect(await notices(id)).toEqual(["handoff"])
    expect(sendSpy).toHaveBeenCalledTimes(1)
  })

  it("a lease held by another run → maybeReply returns without a provider call", async () => {
    const id = await start()
    const lease = await repo.claimLease(id, 90_000)
    expect(lease).toBeTruthy()
    await bot.maybeReply(id)
    expect(calls).toBe(0)
    expect(await aiRows(id)).toHaveLength(0)
    await repo.releaseLease(id, lease!)
    await bot.maybeReply(id)
    expect(calls).toBe(1)
  })

  it("isActive is false when the AI integration is off or has no key", async () => {
    expect(await bot.isActive()).toBe(true)
    const chatSettings = {
      ...CHAT_SETTINGS_DEFAULT,
      enabled: true,
      bot: { ...CHAT_SETTINGS_DEFAULT.bot, enabled: true },
    }
    expect(await bot.isActive(chatSettings)).toBe(true)
    expect(await bot.isActive(null)).toBe(false)
    expect(
      await bot.isActive({
        ...chatSettings,
        bot: { ...chatSettings.bot, enabled: false },
      })
    ).toBe(false)

    await saveAi({ enabled: false })
    expect(await bot.isActive()).toBe(false)
    await saveAi({ enabled: false, apiKey: "" })
    expect(await bot.isActive()).toBe(false)
    await getDb().delete(settings).where(eq(settings.key, "integrations.ai"))
    expect(await bot.isActive()).toBe(false)

    await saveAi()
    await publishChat({}, { enabled: false })
    expect(await bot.isActive()).toBe(false)
    await publishChat({ enabled: false })
    expect(await bot.isActive()).toBe(false)

    // Inactive: maybeReply does nothing at all.
    const id = await start()
    await bot.maybeReply(id)
    expect(calls).toBe(0)
  })

  it("includeMessage false → the alert has no 'Message:' line", async () => {
    await publishChat({ alerts: { includeMessage: false } })
    const id = await start("My address is 1 Main Street")
    await bot.handOff(id, "handoff")
    expect(subjects()).toEqual([NEEDS_PERSON])
    const text = await alertText()
    expect(text).toContain("A visitor is on the chat.")
    expect(text).not.toContain("Message:")
    expect(text).not.toContain("1 Main Street")
  })

  it("the prompt sent to the model never contains the visitor email or IP", async () => {
    const ip = "198.51.100.77"
    const email = "aoife.visitor@example.ie"
    const request = (path: string, body: unknown, cookie?: string) =>
      app.request(`/api/v1/public/chat${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
          origin: ORIGIN,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      })
    const started = await request("/start", {
      message: "Do you clean offices?",
      sourcePath: "/services",
    })
    expect(started.status).toBe(201)
    const cookie = (started.headers.get("set-cookie") ?? "").split(";")[0]!
    await Promise.all(deferred.tasks)
    expect((await request("/email", { email }, cookie)).status).toBeLessThan(
      300
    )
    expect(
      (await request("/messages", { body: "And windows?" }, cookie)).status
    ).toBe(201)
    await Promise.all(deferred.tasks)

    expect(calls).toBe(2)
    for (const prompt of prompts) {
      expect(prompt).not.toContain(email)
      expect(prompt).not.toContain(ip)
    }
  })
})
