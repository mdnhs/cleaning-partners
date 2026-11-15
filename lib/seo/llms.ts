// /llms.txt (llmstxt.org): the site as Markdown for AI assistants. An H1
// with the business name, the summary as a quote, the business details,
// then linked sections; legal pages go under "Optional", which tools may
// skip. Pure: templates/shared/llms.ts maps SiteSources onto it.

export type LlmsLink = { title: string; url: string; description?: string }

export type LlmsInput = {
  siteName: string
  summary: string
  details: string[]
  pages: LlmsLink[]
  services: LlmsLink[]
  articles: LlmsLink[]
  legal: LlmsLink[]
}

/** Whitespace (newlines included) folded to single spaces. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim()

/** Brackets would end the Markdown link text early. */
const linkText = (value: string) => oneLine(value).replace(/[[\]]/g, "")

function section(heading: string, links: LlmsLink[]): string[] {
  const listed = links.filter((link) => linkText(link.title) && link.url)
  if (listed.length === 0) return []
  return [
    `## ${heading}`,
    "",
    ...listed.map((link) => {
      const description = link.description ? oneLine(link.description) : ""
      return `- [${linkText(link.title)}](${link.url})${description ? `: ${description}` : ""}`
    }),
    "",
  ]
}

export function llmsText(i: LlmsInput): string {
  const lines = [`# ${oneLine(i.siteName)}`, ""]
  const summary = oneLine(i.summary)
  if (summary) lines.push(`> ${summary}`, "")
  const details = i.details.map(oneLine).filter(Boolean)
  if (details.length > 0) lines.push(...details.map((d) => `- ${d}`), "")
  lines.push(
    ...section("Pages", i.pages),
    ...section("Services", i.services),
    ...section("Blog", i.articles),
    ...section("Optional", i.legal)
  )
  return `${lines.join("\n").trimEnd()}\n`
}
