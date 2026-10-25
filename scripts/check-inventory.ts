import { readFileSync } from "node:fs"

type Entry = {
  id: string
  source: string
  kind: string
  value: string
  target: string
  pages: string[]
  template?: unknown
  array?: string
}

const KINDS = new Set([
  "text",
  "richText",
  "image",
  "alt",
  "href",
  "tel",
  "mailto",
  "list",
  "aria",
  "meta",
])
const ROOTS = [
  /^pages\.(home|about|services|blog|contact|privacy|terms)\./,
  /^services\[[a-z0-9-]*\]\./,
  /^articles\[[a-z0-9-]*\]\./,
  /^(team|clients|groupCompanies|categories|testimonials)\[\]\./,
  /^settings\.(site|contact|navigation|footer|sections\.clients|sections\.whyChooseUs|sections\.contact|sections\.map|sections\.team|sections\.testimonials|sections\.howItWorks|seo\.defaults|consent|tracking|customCode|microcopy|leads)\./,
]

const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&nbsp;": " ",
}
const collapse = (s: string) => s.replace(/\s+/g, " ")
const normSource = (s: string) =>
  collapse(
    s
      .replace(
        /&(apos|quot|amp|rsquo|lsquo|ldquo|rdquo|nbsp);/g,
        (m) => ENTITIES[m]
      )
      .replace(/\\(["'`])/g, "$1")
      .replace(/ /g, " ")
  )
const normValue = (s: string) => collapse(s.replace(/ /g, " "))

const raw = JSON.parse(readFileSync("docs/brief-inventory.json", "utf8")) as {
  version: number
  entries: Entry[]
}
const errors: string[] = []
if (raw.version !== 1) errors.push("version must be 1")
const ids = new Set<string>()
for (const e of raw.entries) {
  if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`)
  ids.add(e.id)
  if (!KINDS.has(e.kind)) errors.push(`${e.id}: bad kind ${e.kind}`)
  if (!ROOTS.some((r) => r.test(e.target)))
    errors.push(`${e.id}: bad target ${e.target}`)
  if (!/^(app|components|lib)\/.+:\d+$/.test(e.source)) {
    errors.push(`${e.id}: bad source ${e.source}`)
    continue
  }
  const [file, line] = e.source.split(":")
  const text = readFileSync(file, "utf8")
  const lines = text.split("\n")
  if (Number(line) < 1 || Number(line) > lines.length)
    errors.push(`${e.id}: line out of range`)
  if (!Array.isArray(e.pages) || e.pages.length === 0)
    errors.push(`${e.id}: pages empty`)
  if (e.template !== undefined && typeof e.template !== "boolean")
    errors.push(`${e.id}: template must be boolean`)
  // Stale line numbers fail: value (or array declaration) must be in a
  // window of lines (line-1 .. line+8) around the stated source line.
  const windowText = lines
    .slice(Math.max(0, Number(line) - 2), Number(line) + 8)
    .join("\n")
  if (e.kind === "list") {
    if (!e.array) errors.push(`${e.id}: list entry needs "array" identifier`)
    else {
      const id = e.array.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const decl = new RegExp(`\\b${id}\\s*[:=]|const\\s+${id}\\b`)
      if (!decl.test(windowText))
        errors.push(`${e.id}: array ${e.array} not declared near ${e.source}`)
    }
  } else if (!normSource(windowText).includes(normValue(e.value))) {
    errors.push(`${e.id}: value not found verbatim near ${e.source}`)
  }
}
// A value with {…} placeholders is either a template field (template: true,
// seeded verbatim, interpolated at render) or a derived usage whose source
// value is another entry with the same target and no placeholders.
for (const e of raw.entries) {
  if (!e.value.includes("{") || e.template === true) continue
  const hasSource = raw.entries.some(
    (o) => o !== e && o.target === e.target && !o.value.includes("{")
  )
  if (!hasSource)
    errors.push(
      `${e.id}: placeholder value without template: true and no source entry for ${e.target}`
    )
}
if (raw.entries.length < 200)
  errors.push(`only ${raw.entries.length} entries — inventory incomplete`)
if (errors.length) {
  console.error(errors.join("\n"))
  process.exit(1)
}
console.log(`inventory ok: ${raw.entries.length} entries`)
