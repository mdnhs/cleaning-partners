/** The placeholders a chat text may hold (settings.chat copy and notices). */
export type ChatTextValues = Partial<
  Record<"team" | "botName" | "agent" | "name", string>
>

const PLACEHOLDER = /\{(team|botName|agent|name)\}/g

/**
 * Fills {team}, {botName}, {agent} and {name} where a value is given. Any
 * other {…}, or one without a value, stays as typed. Pure and isomorphic.
 */
export function fillChatText(template: string, values: ChatTextValues): string {
  return template.replace(
    PLACEHOLDER,
    (match, key: keyof ChatTextValues) => values[key] ?? match
  )
}
